"""ヤコブによる幼児福音書（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/infancyjames を保存した HTML。
読み方の本体は sectioned.py にある。

原始福音書（Protevangelium of James）とも呼ばれる、マリアの誕生から
ヘロデの幼児虐殺までを語る書。トマスによる幼児福音書と同じ形。

  - 章 = "Chapter 5: Mary's Birth" の見出しが持つ番号（1..25）
  - 節 = 段落先頭の丸括弧数字 "(1)"（章ごとに 1 へ戻る）

本文の後ろには「第18〜21章の短い異版」の付録が続き、その中に2度目の
"Chapter 18:" が現れる。本文と混ざるので付録の見出しで本文を打ち切る
（付録は取り込まない）。
"""

from __future__ import annotations

import re

from .sectioned import PARENTHESIZED, BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Infancy Gospel of James"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 655
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章見出し: "Chapter 5: Mary's Birth" → 章番号 5 / 章名 "Mary's Birth" ---
HEADING = re.compile(r"^Chapter\s+(?P<number>\d+)\s*:\s*(?P<title>.*)$")

# --- 本文の終端マーカー（これ以降は別写本の異版なので本文外）---
END_HEADING = "Appendix: A Shorter Version of Chapters 18 - 21"

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    heading_pattern=HEADING,
    verse_marker=PARENTHESIZED,
    verses_restart_each_chapter=True,
    end_heading=END_HEADING,
    max_container_chars=30000,
)


def parse_infancy_james(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
