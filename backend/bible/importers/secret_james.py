"""ヤコブの秘密の書（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/james を保存した HTML。
読み方の本体は sectioned.py（章＝見出し／節＝写本の番号 型）にある。

マリアの福音書と同じ型。節番号は Nag Hammadi 写本のページ番号で、1..16 が
見出しをまたいで連続する。そのため章 2 以降は途中のページから始まる。

  - 章 = 訳者が付けたセクション見出し（登場順に 1,2,3...）
  - 節 = 本文中のページ番号（空白で囲まれた数字）
"""

from __future__ import annotations

from .sectioned import PAGE_NUMBER, BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Secret Book of James"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 630
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章 = セクション見出し（訳者が付けた小見出し、登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "Salutation",
    "Prologue",
    "The Savior Appears",
    "Being Filled",
    "The Cross and Death",
    "Prophecies and Parables",
    "Be Saved",
    "Few Have Found the Kingdom",
    "Know Yourselves",
    "Final Words",
    "Heavenly Ascent",
    "Conclusion",
]

# --- 本文の終端マーカー（これ以降は訳者による注なので本文外）---
END_HEADING = "Notes on Translation"

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    headings=tuple(SECTION_HEADINGS),
    verse_marker=PAGE_NUMBER,
    end_heading=END_HEADING,
    max_container_chars=25000,
)


def parse_secret_james(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
