"""正規化した解釈書データ（1冊ぶんの dict）を検証して DB へ入れる。

データの形（commentary/seed/*.json.gz の中身）:

    {
      "slug": "calvin-romans",
      "title": "Commentary on Romans", "title_ja": "カルヴァン ローマ書注解",
      "author": "John Calvin", "author_ja": "ジャン・カルヴァン", "year": 1540,
      "tradition": "reformation", "language": "en",
      "translator": "...", "source_name": "...", "source_url": "https://...",
      "license": "public-domain", "license_note": "...", "readable": true,
      "chapters": [
        {"number": 8, "title": "8章",
         "links": [],                      # 章そのものが論じる箇所（講の対象箇所など）
         "sections": [                     # 区切り。番号は章の中で 1 から順に振られる
           {"heading": "Romans 8:28", "text": "...", "source_url": "",
            "links": [{"book": "romans", "chapter": 8, "verse": 28,
                       "chapter_end": 8, "verse_end": 28,
                       "method": "structure", "confidence": null}]}
         ]}
      ]
    }

同じ slug の本がすでにあれば、章と区切りをいったん消して入れ直す（何度流しても同じ結果）。
コメント・Q&A・お気に入りは「解釈書・章番号・区切り番号」で付くので、区切りを消しても消えない。
ただし番号や本文が変わるとコメントが別の段落に付いてしまうので、そうなる入れ直しは止める
（check_positions_kept）。
"""

from __future__ import annotations

import gzip
import json
from pathlib import Path

from django.db import transaction

from bible.canonical import DATA_PATH as CANONICAL_PATH
from bible.models import CanonicalBook

from .models import CommentaryChapter, PassageLink, Section, Work

WORK_FIELDS = (
    "slug", "title", "title_ja", "author", "author_ja", "year", "tradition", "language",
    "translator", "source_name", "source_url", "license", "license_note", "readable", "order",
)
REQUIRED = ("slug", "title", "author", "tradition", "language", "source_name", "source_url", "license", "chapters")


class CommentaryDataError(ValueError):
    """データの形が正しくないとき、または入れ直すとコメント等の付き先が変わってしまうときに投げる。"""


def known_book_slugs() -> set[str]:
    """このサービスが持つ書の slug（bible/data/canonical_books.json が正）。"""
    data = json.loads(Path(CANONICAL_PATH).read_text(encoding="utf-8"))
    return {entry["slug"] for entry in data}


def read_seed(path: Path) -> dict:
    """seed ファイル（.json.gz または .json）を読む。"""
    raw = path.read_bytes()
    if path.suffix == ".gz":
        raw = gzip.decompress(raw)
    return json.loads(raw.decode("utf-8"))


def _validate_links(links: list[dict], where: str, book_slugs: set[str]) -> None:
    for link in links:
        if link["book"] not in book_slugs:
            raise CommentaryDataError(f"{where} に未知の書があります: {link['book']}")
        if link["method"] not in PassageLink.Method.values:
            raise CommentaryDataError(f"{where} の method が不正です: {link['method']}")
        if link["method"] == PassageLink.Method.AI and link.get("confidence") is None:
            raise CommentaryDataError(f"{where} の AI 判定に confidence がありません")


def validate(data: dict, book_slugs: set[str]) -> None:
    """入れる前に形を確かめる。問題があれば CommentaryDataError。"""
    missing = [k for k in REQUIRED if k not in data]
    if missing:
        raise CommentaryDataError(f"必須キーがありません: {missing}")
    if data["tradition"] not in Work.Tradition.values:
        raise CommentaryDataError(f"tradition が不正です: {data['tradition']}")
    if data["license"] not in Work.License.values:
        raise CommentaryDataError(f"license が不正です: {data['license']}")
    if not data["chapters"]:
        raise CommentaryDataError("章が1つもありません")
    numbers = [c["number"] for c in data["chapters"]]
    # 章番号は 0 から（序や前書きを 0 章にする本がある。聖書でもトマスの福音書は 0 章から）。
    if len(set(numbers)) != len(numbers) or any(n < 0 for n in numbers):
        raise CommentaryDataError(f"章番号が重複しているか負です: {numbers}")
    for chapter in data["chapters"]:
        where = f"第{chapter['number']}章"
        _validate_links(chapter.get("links", []), where, book_slugs)
        if not chapter.get("sections"):
            raise CommentaryDataError(f"{where} に区切りがありません")
        for i, section in enumerate(chapter["sections"], start=1):
            if not section.get("text"):
                raise CommentaryDataError(f"{where} {i} の本文が空です")
            _validate_links(section.get("links", []), f"{where} {i}", book_slugs)


def seed_positions(data: dict) -> dict[tuple[int, int | None], str]:
    """seed の中の場所 → 本文。章そのものは (章番号, None)。"""
    positions: dict[tuple[int, int | None], str] = {}
    for chapter in data["chapters"]:
        positions[(chapter["number"], None)] = chapter.get("title", "")
        for i, section in enumerate(chapter["sections"], start=1):
            positions[(chapter["number"], i)] = section["text"]
    return positions


def attached_positions(work: Work) -> set[tuple[int | None, int | None]]:
    """コメント・Q&A・お気に入りが付いている場所（章番号, 区切り番号）。書全体は (None, None)。

    手順2で各アプリに解釈書の場所が入るまでは空。
    """
    from .attachments import attached_positions as collect

    return collect(work)


def check_positions_kept(work: Work, data: dict) -> None:
    """コメント等が付いている場所が、入れ直しのあとも同じ中身で残るか確かめる。"""
    attached = attached_positions(work)
    if not attached:
        return
    new = seed_positions(data)
    old = {(c.number, None): c.title for c in work.chapters.all()}
    old.update({(s.chapter_number, s.number): s.text for s in work.sections.all()})
    broken = []
    for chapter, number in sorted(attached, key=lambda p: (p[0] or 0, p[1] or 0)):
        if chapter is None:
            continue  # 書全体へのものは、本がある限り付き先が変わらない
        key = (chapter, number)
        if key not in new or new[key] != old.get(key):
            broken.append(f"{chapter}:{number}" if number else f"{chapter}章")
    if broken:
        raise CommentaryDataError(
            f"{work.slug}: コメント等が付いている場所の番号か本文が変わります（{', '.join(broken[:10])}）。"
            " 番号を変えない形で seed を作り直してください。"
        )


def _link(link: dict, canon: dict[str, CanonicalBook], **target) -> PassageLink:
    slug = link["book"]
    if slug not in canon:
        # 書の行がまだ無い環境（聖書本文の投入前など）でも入れられるよう、正本にある slug だけ作る。
        canon[slug], _ = CanonicalBook.objects.get_or_create(slug=slug)
    return PassageLink(
        canonical_book=canon[slug],
        chapter=link.get("chapter"),
        verse=link.get("verse"),
        chapter_end=link.get("chapter_end"),
        verse_end=link.get("verse_end"),
        method=link["method"],
        confidence=link.get("confidence"),
        **target,
    )


@transaction.atomic
def load_work(data: dict, book_slugs: set[str] | None = None, force: bool = False) -> tuple[Work, int, int]:
    """1冊ぶんを入れる。戻り値は (Work, 区切りの数, 箇所の数)。

    force=True は「コメント等の付き先が変わっても入れ直す」。普段は使わない。
    """
    if book_slugs is None:
        book_slugs = known_book_slugs()
    validate(data, book_slugs)

    existing = Work.objects.filter(slug=data["slug"]).first()
    if existing and not force:
        check_positions_kept(existing, data)

    fields = {k: data[k] for k in WORK_FIELDS if k in data and k != "slug"}
    work, _ = Work.objects.update_or_create(slug=data["slug"], defaults=fields)
    # 入れ直し。章と区切りを消すと、それに付いた箇所も一緒に消える（CASCADE）。
    work.sections.all().delete()
    work.chapters.all().delete()

    chapters = CommentaryChapter.objects.bulk_create(
        [
            CommentaryChapter(
                work=work,
                number=c["number"],
                title=(c.get("title") or "")[:500],
                title_en=(c.get("title_en") or "")[:500],
            )
            for c in data["chapters"]
        ]
    )

    section_rows: list[Section] = []
    section_links: list[list[dict]] = []
    order = 0
    for c in data["chapters"]:
        for i, s in enumerate(c["sections"], start=1):
            section_rows.append(
                Section(
                    work=work,
                    chapter_number=c["number"],
                    number=i,
                    order=order,
                    heading=(s.get("heading") or "")[:500],
                    text=s["text"],
                    source_url=s.get("source_url") or "",
                )
            )
            section_links.append(s.get("links", []))
            order += 1
    sections = Section.objects.bulk_create(section_rows, batch_size=1000)

    canon: dict[str, CanonicalBook] = {}
    links: list[PassageLink] = []
    for chapter, c in zip(chapters, data["chapters"]):
        links += [_link(lk, canon, commentary_chapter=chapter) for lk in c.get("links", [])]
    for section, raw in zip(sections, section_links):
        links += [_link(lk, canon, section=section) for lk in raw]
    PassageLink.objects.bulk_create(links, batch_size=2000)
    return work, len(sections), len(links)
