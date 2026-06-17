"""ユダの福音書（gospels.net / Mark M. Mattison 英訳）の HTML パーサ。

入力: gospels.net/judas を保存した HTML。
出力: 正規化スキーマの dict（__init__.py 参照）と、気づいた点の警告リスト。

DB には一切触れない。取り込み前の確認はこの出力を validate / preview にかけて行う。

マリアの福音書と同じ「章＝セクション見出し」型。節番号は写本（Codex Tchacos）の
ページ番号で、本文中に "33" のように現れ、33..58 が見出しをまたいで連続する。
そのため章 2 以降は途中のページから始まる（マリアと同じ性質）。

  - 章 = 訳者が付けたセクション見出し（SECTION_HEADINGS、登場順に 1,2,3...）
  - 節 = 本文中のページ番号（空白で囲まれた数字）

末尾のコロフォン "The Gospel of Judas" 以降は訳注なので本文外。
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Gospel of Judas"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 680
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章 = セクション見出し（訳者が付けた小見出し、登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "Introduction",
    "Jesus Criticizes the Disciples",
    "Another Generation",
    "The Disciples' Vision",
    "Jesus and Judas",
    "Jesus Reveals Everything to Judas",
    "The Betrayal",
]

# --- 本文の終端マーカー（写本末尾のコロフォン。これ以降は訳注なので本文外）---
END_HEADING = "The Gospel of Judas"

# --- 節マーカー: 空白(または先頭)で囲まれた1〜2桁の数字（ページ番号）---
_PAGE = re.compile(r"(?:^|(?<=\s))(\d{1,2})(?=\s|$)")


def _normalize(text: str) -> str:
    """空白を整え、引用符の字種をそろえる（見出し照合のため）。"""
    text = text.replace("\xa0", " ").replace("’", "'")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _find_body_paragraphs(soup: BeautifulSoup) -> list[str]:
    """本文の段落テキスト列を返す（最もテキスト量の多いコンテナの <p>）。"""
    for junk in soup.select("script, style, nav, header, footer"):
        junk.decompose()

    container = None
    best = 0
    for el in soup.find_all(["div", "section", "article"]):
        length = len(el.get_text(strip=True))
        if best < length < 25000:  # 極端に大きいものは外枠とみなして除外
            best = length
            container = el
    if container is None:
        container = soup.body or soup

    return [p.get_text(" ", strip=True) for p in container.find_all("p")]


def _split_pages(stream: str) -> list[dict]:
    """章のテキストをページ番号で節に分割する。

    - 最初のページ番号より前のテキスト（前の章から続く番号なしの段落）は、
      最初の節に前置きして捨てない。
    - ページ番号は単調増加する性質を使い、戻る数字は本文として残す。
    """
    matches = [(m.start(), m.end(), int(m.group(1))) for m in _PAGE.finditer(stream)]

    accepted: list[tuple[int, int, int]] = []
    hi = 0
    for start, end, num in matches:
        if num > hi:
            accepted.append((start, end, num))
            hi = num

    if not accepted:
        text = _normalize(stream)
        return [{"number": 1, "text": text}] if text else []

    verses: list[dict] = []
    for i, (start, end, num) in enumerate(accepted):
        next_start = accepted[i + 1][0] if i + 1 < len(accepted) else len(stream)
        body = stream[end:next_start]
        if i == 0 and start > 0:
            body = stream[:start] + " " + body  # 章冒頭の番号なしテキストを最初の節に含める
        text = _normalize(body)
        if text:
            verses.append({"number": num, "text": text})
    return verses


def parse_judas(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    soup = BeautifulSoup(html, "html.parser")
    paragraphs = _find_body_paragraphs(soup)
    warnings: list[str] = []

    headings = set(SECTION_HEADINGS)
    chapter_pieces: list[list[str]] = []
    chapter_names: list[str] = []
    started = False

    for raw in paragraphs:
        text = _normalize(raw)
        if not text:
            continue

        if text == END_HEADING:
            break  # コロフォン以降は訳注なので終了

        if text in headings:
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
        verses = _split_pages("\n".join(pieces))
        if not verses:
            warnings.append(f"第{i + 1}章（{chapter_names[i]}）: 本文が空でした")
        chapters.append({"number": i + 1, "verses": verses})

    missing_sections = [h for h in SECTION_HEADINGS if h not in set(chapter_names)]
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
