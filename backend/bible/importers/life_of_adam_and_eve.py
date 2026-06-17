"""アダムとエバの生涯（Vita Adae et Evae / sacred-texts.com の L. S. A. Wells 訳）のパーサ。

入力: sacred-texts.com/chr/apo/adamnev.htm を保存した HTML。
出力: 正規化スキーマの dict（__init__.py 参照）と、気づいた点の警告リスト。

DB には一切触れない。取り込み前の確認はこの出力を validate / preview にかけて行う。

gospels.net 系と違い、章は段落先頭の小文字ローマ数字（i, ii, ... li の 51 章）、
節はアラビア数字。エノク書に近いが、この版には次の癖がある:

  - 32 章(xxxii)と 37 章(xxxvii)は原文で章番号が脱落している。該当章は固有の
    書き出しで始まるため、DROPPED_CHAPTERS で章番号を補って認識する。
  - 章 iii の節 1 は "1" でなく "I" と表記されている。
  - "1,2" のような範囲表記の節がある（先頭の番号を採り、本文は結合する）。
  - 節番号のない段落（直前の節の続き）は直前の節に連結する。
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

from .enoch import roman_to_int

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Life of Adam and Eve"
TRANSLATION = "L. S. A. Wells (EN)"
ORDER = 800
SOURCE = "sacred-texts.com (L. S. A. Wells, R. H. Charles ed., public domain)"

# --- 章見出し: 段落先頭の小文字ローマ数字 + 空白 ---
_CHAPTER = re.compile(r"^([ivxlcdm]+)\s+")

# --- 節マーカー: 段落先頭のアラビア数字（"1" や範囲 "1,2"）---
_VERSE = re.compile(r"^(\d+)(?:\s*,\s*\d+)?\s+")

# --- 原文で章番号が脱落している章。固有の書き出しで認識する。---
DROPPED_CHAPTERS = {
    32: "And Adam answered and said: 'Hear me, my sons.",
    37: "Then Seth and his mother went off towards the gates of parad",
}


def _normalize(text: str) -> str:
    """空白を整える（段落内の改行も 1 つの空白に潰す）。"""
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _find_body_paragraphs(soup: BeautifulSoup) -> list[str]:
    """本文の段落テキスト列を返す（body 直下の <p>）。"""
    for junk in soup.select("script, style, nav, header, footer"):
        junk.decompose()
    body = soup.body or soup
    return [p.get_text(" ", strip=True) for p in body.find_all("p")]


def _add_content(chapter: dict, text: str, is_chapter_start: bool) -> None:
    """章にテキストを足す。

    先頭に節番号があれば新しい節を作り、無ければ直前の節に連結する。
    章の先頭で番号が "I"（章 iii）/ 番号なし（脱落章の節 1）の場合も節 1 にする。
    """
    text = _normalize(text)
    if not text:
        return

    m = _VERSE.match(text)
    if m:
        chapter["verses"].append({"number": int(m.group(1)), "text": text[m.end():].strip()})
        return

    if is_chapter_start and text.startswith("I "):  # 章 iii の "I"（=節1）
        chapter["verses"].append({"number": 1, "text": text[2:].strip()})
        return

    if not chapter["verses"]:  # 章冒頭で番号が無い（脱落章の節1など）
        chapter["verses"].append({"number": 1, "text": text})
    else:  # 番号なしの続き → 直前の節に連結
        chapter["verses"][-1]["text"] += " " + text


def parse_life_of_adam_and_eve(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    soup = BeautifulSoup(html, "html.parser")
    paragraphs = _find_body_paragraphs(soup)
    warnings: list[str] = []

    chapters: list[dict] = []
    current: dict | None = None
    current_num = 0

    for raw in paragraphs:
        text = _normalize(raw)
        if not text:
            continue

        # --- 章の検出 ---
        new_num: int | None = None
        rest = text

        m = _CHAPTER.match(text)
        if m:
            value = roman_to_int(m.group(1))
            if value == current_num + 1:  # 連番のローマ数字だけを章として採用
                new_num = value
                rest = text[m.end():]
        if new_num is None:  # 章番号が脱落した章を書き出しで補う
            prefix = DROPPED_CHAPTERS.get(current_num + 1)
            if prefix and text.startswith(prefix):
                new_num = current_num + 1
                rest = text

        if new_num is not None:
            current = {"number": new_num, "verses": []}
            chapters.append(current)
            current_num = new_num
            _add_content(current, rest, is_chapter_start=True)
            continue

        if current is None:
            continue  # 最初の章より前（あれば）は無視
        _add_content(current, text, is_chapter_start=False)

    nums = [c["number"] for c in chapters]
    if nums != list(range(1, len(nums) + 1)):
        missing = [n for n in range(1, (max(nums) if nums else 0) + 1) if n not in nums]
        if missing:
            warnings.append(f"章番号の欠落: {missing}")

    data = {
        "book": BOOK_NAME,
        "translation": TRANSLATION,
        "order": ORDER,
        "source": SOURCE,
        "chapters": chapters,
    }
    return data, warnings
