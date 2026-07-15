"""トマスによる幼児福音書（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/infancythomas を保存した HTML。
読み方の本体は sectioned.py にある。

少年イエスの奇跡を語る書。ヤコブによる幼児福音書と同じ形。

  - 章 = "Chapter 5: Joseph Confronts Jesus" の見出しが持つ番号（1..19）
  - 節 = 段落先頭の丸括弧数字 "(1)"（章ごとに 1 へ戻る）
"""

from __future__ import annotations

import re

from .sectioned import PARENTHESIZED, BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Infancy Gospel of Thomas"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 660
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章見出し: "Chapter 5: Joseph Confronts Jesus" → 章番号 5 / 章名 "Joseph Confronts Jesus" ---
HEADING = re.compile(r"^Chapter\s+(?P<number>\d+)\s*:\s*(?P<title>.*)$")

# --- 本文の終端マーカー（これ以降は注釈なので本文外）---
END_HEADING = "Notes"

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    heading_pattern=HEADING,
    verse_marker=PARENTHESIZED,
    verses_restart_each_chapter=True,
    end_heading=END_HEADING,
    # 取り込み済みの本文を変えないため、この書は引用符をそのまま残す
    normalize_quotes=False,
)


def parse_infancy_thomas(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
