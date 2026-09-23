"""収集スクリプト共通の小道具。

collectors/ の中身はローカルで一度だけ流して seed を作るためのもの。本番では使わない
（本番は seed を import_commentary で入れるだけ）。
"""

from __future__ import annotations

import gzip
import json
import re
from pathlib import Path

from commentary.refs import Ref

SEED_DIR = Path(__file__).resolve().parents[1] / "seed"


def link(ref: Ref, method: str, confidence: float | None = None) -> dict:
    """Ref を seed の links の1件にする。"""
    return {**ref.as_dict(), "method": method, "confidence": confidence}


def dedupe_links(links: list[dict]) -> list[dict]:
    """同じ区切りの中の同じ箇所・同じ方法は1件にまとめる（順番は保つ）。"""
    seen: set[tuple] = set()
    out = []
    for item in links:
        key = (item["book"], item["chapter"], item["verse"], item["chapter_end"], item["verse_end"], item["method"])
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def clean_text(text: str) -> str:
    """連続する空白を1つにし、前後の空白を落とす。段落の区切り（空行）は残す。"""
    paragraphs = [re.sub(r"[ \t\r\f\v ]+", " ", p).strip() for p in re.split(r"\n\s*\n", text)]
    paragraphs = [re.sub(r"\s*\n\s*", " ", p) for p in paragraphs]
    return "\n\n".join(p for p in paragraphs if p)


def write_seed(data: dict, seed_dir: Path = SEED_DIR) -> Path:
    """1冊ぶんを commentary/seed/<slug>.json.gz に書く。

    gzip の中の時刻を 0 に固定し、同じ中身なら同じファイルになるようにする（git の差分が出ない）。
    """
    from .english import add_english_notes

    add_english_notes(data)
    seed_dir.mkdir(parents=True, exist_ok=True)
    path = seed_dir / f"{data['slug']}.json.gz"
    raw = json.dumps(data, ensure_ascii=False, indent=0).encode("utf-8")
    path.write_bytes(gzip.compress(raw, compresslevel=9, mtime=0))
    return path


def summarize(data: dict) -> str:
    """件数の要約（収集結果の確認用）。"""
    sections = [s for c in data["chapters"] for s in c["sections"]]
    links = [lk for c in data["chapters"] for lk in c.get("links", [])]
    links += [lk for s in sections for lk in s.get("links", [])]
    by_method: dict[str, int] = {}
    for lk in links:
        by_method[lk["method"]] = by_method.get(lk["method"], 0) + 1
    chars = sum(len(s["text"]) for s in sections)
    return (
        f"{data['slug']}: 章 {len(data['chapters'])} / 区切り {len(sections)} / 箇所 {len(links)} {by_method}"
        f" / {chars // 1000}k 字"
    )


# ---------------------------------------------------------------------------
# 章への組み分け（解釈書を「章 → 区切り」の形にする）
# ---------------------------------------------------------------------------

# 聖書の書の日本語名。口語訳の書名（bible/data/canonical_books.json）に無い第二正典だけここで足す。
_DEUTERO_JA = {
    "tobit": "トビト記", "judith": "ユディト記", "wisdom": "知恵の書", "sirach": "シラ書",
    "baruch": "バルク書", "1-maccabees": "マカバイ記一", "2-maccabees": "マカバイ記二",
}


def book_name_ja(slug: str) -> str:
    """聖書の書の日本語名（口語訳の書名）。"""
    from bible.canonical import DATA_PATH

    if not hasattr(book_name_ja, "_cache"):
        data = json.loads(Path(DATA_PATH).read_text(encoding="utf-8"))
        names = {e["slug"]: next((b["name"] for b in e["books"] if b["translation"] == "口語訳"), "") for e in data}
        book_name_ja._cache = {**_DEUTERO_JA, **{k: v for k, v in names.items() if v}}
    return book_name_ja._cache.get(slug, slug)


def book_name_en(slug: str) -> str:
    from commentary.refs import ENGLISH_TO_SLUG

    return next((name for name, s in ENGLISH_TO_SLUG.items() if s == slug), slug)


def primary_ref(section: dict) -> dict | None:
    """区切りが主に論じている箇所（最初の構造の結び付き）。"""
    return next((lk for lk in section.get("links", []) if lk["method"] == "structure"), None)


def _verse_key(section: dict) -> tuple:
    ref = primary_ref(section) or {}
    return (ref.get("chapter") or 0, ref.get("verse") or 0)


def split_by_bible_book(meta: dict, sections: list[dict], slug_prefix: str,
                        title_ja: str, title_en: str) -> list[dict]:
    """聖書の順に節ごとに注解する本を、聖書の書ごとの1冊に分ける。章＝聖書の章。

    title_ja / title_en は書名を {book} に差し込む書式（例: "カルヴァン {book}注解"）。
    区切りの並びは元の本の順のまま（同じ節への注解が複数あれば、その順）。
    """
    from commentary.refs import OSIS_TO_SLUG

    order = {slug: i for i, slug in enumerate(OSIS_TO_SLUG.values())}
    by_book: dict[str, list[dict]] = {}
    for s in sections:
        ref = primary_ref(s)
        if ref is None or ref.get("chapter") is None:
            continue
        by_book.setdefault(ref["book"], []).append(s)

    works = []
    for book in sorted(by_book, key=lambda b: order.get(b, 999)):
        # 同じ著者の本を聖書の順に並べるための番号（1 から）
        book_order = order.get(book, 998) + 1
        chapters: dict[int, list[dict]] = {}
        for s in by_book[book]:
            chapters.setdefault(primary_ref(s)["chapter"], []).append(s)
        works.append({
            **meta,
            "slug": f"{slug_prefix}-{book}",
            "title": title_en.format(book=book_name_en(book)),
            "title_ja": title_ja.format(book=book_name_ja(book)),
            "order": book_order,
            "chapters": [
                {"number": n, "title": f"{book_name_ja(book)} {n}章", "title_en": f"{book_name_en(book)} {n}",
                 "links": [], "sections": chapters[n]}
                for n in sorted(chapters)
            ],
        })
    return works


def chapters_by_bible_book(sections: list[dict]) -> list[dict]:
    """抜粋集を「章＝聖書の書」に組む。章番号は、その本に出てくる書を聖書の順に並べた番号。"""
    from commentary.refs import OSIS_TO_SLUG

    order = {slug: i for i, slug in enumerate(OSIS_TO_SLUG.values())}
    by_book: dict[str, list[dict]] = {}
    for s in sections:
        ref = primary_ref(s)
        if ref is not None:
            by_book.setdefault(ref["book"], []).append(s)
    books = sorted(by_book, key=lambda b: order.get(b, 999))
    return [
        {"number": i, "title": book_name_ja(book), "title_en": book_name_en(book), "links": [],
         "sections": sorted(by_book[book], key=_verse_key)}
        for i, book in enumerate(books, start=1)
    ]


def chapters_by_heading(sections: list[dict]) -> list[dict]:
    """段落の見出し（「Book I › Chapter I」など）が変わるところで章を切る。見出しは章の題へ移す。"""
    chapters: list[dict] = []
    for s in sections:
        heading = s.get("heading", "")
        if not chapters or chapters[-1]["title"] != heading:
            # 原著の見出しは英語なので、英語の画面でもそのまま使う
            chapters.append({"number": len(chapters) + 1, "title": heading, "title_en": heading, "links": [],
                             "sections": []})
        chapters[-1]["sections"].append({**s, "heading": ""})
    return chapters


def split_paragraphs(text: str) -> list[str]:
    """空行で区切られた段落に分ける。"""
    return [p.strip() for p in text.split("\n\n") if p.strip()]
