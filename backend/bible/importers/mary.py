"""マリアの福音書（gospels.net / Mark M. Mattison 英訳）の HTML パーサ。

入力: gospels.net/mary を保存した HTML。
出力: 正規化スキーマの dict（__init__.py 参照）と、気づいた点の警告リスト。

DB には一切触れない。取り込み前の確認はこの出力を validate / preview にかけて行う。

この書は章番号・節番号を持たない。原文は写本の「ページ番号」(7〜19, 1〜6 と
11〜14 は欠落) と、訳者が付けたセクション見出しで区切られている。そこで:

  - 章 = セクション見出し（登場順に 1,2,3...、見出し文は books.ts 側に持つ）
  - 節 = ページ番号（本文中に "7" や "Don't 9 lay down" の形で現れる）

エノク書と違い HTML は全段落がタグ上は区別のない <p> なので、見出しは既知の
文字列で、ページ番号は「空白で囲まれた1〜2桁の数字」で判定する。
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Gospel of Mary"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 650
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章 = セクション見出し（訳者が付けた小見出し、登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "An Eternal Perspective",
    "The Gospel",
    "Mary and Jesus",
    "Overcoming the Powers",
    "Conflict over Authority",
]

# --- 本文の終端マーカー（写本末尾のコロフォン。これ以降は訳注なので本文外）---
END_HEADING = "The Gospel According to Mary"

# --- ページ番号: 空白(または先頭)で囲まれた1〜2桁の数字 ---
_PAGE = re.compile(r"(?:^|(?<=\s))(\d{1,2})(?=\s|$)")

# --- 欠落注記: "Pages 11 through 14 are missing." のような行 ---
#     本文に残しつつ、中の数字をページ番号と誤検出しないよう先に退避する。
_MISSING = re.compile(
    r"Pages?\s+\d+(?:\s+through\s+\d+)?\s+(?:are|is)\s+missing\.?", re.I
)
_MISSING_PLACEHOLDER = "\x00MISSING{}\x00"


def _normalize(text: str) -> str:
    """空白を整える。"""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _find_body_paragraphs(soup: BeautifulSoup) -> list[str]:
    """本文の段落テキスト列を返す。

    Squarespace 由来でページ全体に装飾要素が多いため、最もテキスト量の多い
    コンテナ（極端に大きいものは外枠なので除く）を本文とみなし、その <p> を拾う。
    """
    for junk in soup.select("script, style, nav, header, footer"):
        junk.decompose()

    container = None
    best = 0
    for el in soup.find_all(["div", "section", "article"]):
        length = len(el.get_text(strip=True))
        # 2万字超は外枠（サイドバー等を含む親）とみなして除外する
        if best < length < 20000:
            best = length
            container = el
    if container is None:
        container = soup.body or soup

    return [p.get_text(" ", strip=True) for p in container.find_all("p")]


def _split_pages(stream: str, store: list[str]) -> list[dict]:
    """章のテキストをページ番号で節に分割する。

    - 最初のページ番号より前のテキスト（章冒頭。前章ページの続き）は、
      最初の節に前置きして捨てない。
    - ページ番号は単調増加する性質を使い、戻る数字は本文として残す。
    - 欠落注記中の数字は退避済み（store）なので境界にならない。
    """
    matches = [(m.start(), m.end(), int(m.group(1))) for m in _PAGE.finditer(stream)]

    # 単調増加だけを節境界に採用（誤検出した小さな数字を本文に残す）
    accepted: list[tuple[int, int, int]] = []
    hi = 0
    for start, end, num in matches:
        if num > hi:
            accepted.append((start, end, num))
            hi = num

    if not accepted:
        text = _restore(_normalize(stream), store)
        return [{"number": 1, "text": text}] if text else []

    verses: list[dict] = []
    for i, (start, end, num) in enumerate(accepted):
        next_start = accepted[i + 1][0] if i + 1 < len(accepted) else len(stream)
        body = stream[end:next_start]
        if i == 0:
            body = stream[:start] + " " + body  # 章冒頭テキストを最初の節に含める
        text = _restore(_normalize(body), store)
        if text:
            verses.append({"number": num, "text": text})
    return verses


def _mask_missing(stream: str, store: list[str]) -> str:
    """欠落注記をプレースホルダに退避する（中の数字の誤検出防止）。"""

    def repl(m: re.Match) -> str:
        store.append(m.group(0))
        return _MISSING_PLACEHOLDER.format(len(store) - 1)

    return _MISSING.sub(repl, stream)


def _restore(text: str, store: list[str]) -> str:
    """退避した欠落注記を本文に戻す。"""
    def repl(m: re.Match) -> str:
        return store[int(m.group(1))]

    return re.sub(r"\x00MISSING(\d+)\x00", repl, text)


def parse_mary(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    soup = BeautifulSoup(html, "html.parser")
    paragraphs = _find_body_paragraphs(soup)
    warnings: list[str] = []

    # 章ごとにテキスト断片を貯める
    chapter_pieces: list[list[str]] = []
    chapter_names: list[str] = []
    started = False

    for raw in paragraphs:
        text = _normalize(raw)
        if not text:
            continue

        if text == END_HEADING:
            break  # コロフォン以降は訳注なので終了

        if text in SECTION_HEADINGS:
            chapter_pieces.append([])
            chapter_names.append(text)
            started = True
            continue

        if not started:
            continue  # 最初のセクション見出しより前（前書き・記号説明）は無視
        chapter_pieces[-1].append(text)

    # --- 章ごとに節へ分割 ---
    chapters: list[dict] = []
    for i, pieces in enumerate(chapter_pieces):
        store: list[str] = []
        stream = _mask_missing("\n".join(pieces), store)
        verses = _split_pages(stream, store)
        if not verses:
            warnings.append(f"第{i + 1}章（{chapter_names[i]}）: 本文が空でした")
        chapters.append({"number": i + 1, "verses": verses})

    found = set(chapter_names)
    missing_sections = [h for h in SECTION_HEADINGS if h not in found]
    if missing_sections:
        warnings.append(f"見つからなかったセクション見出し: {missing_sections}")

    data = {
        "book": BOOK_NAME,
        "translation": TRANSLATION,
        "order": ORDER,
        "source": SOURCE,
        "chapters": chapters,
    }
    return data, warnings
