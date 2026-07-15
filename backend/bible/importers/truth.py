"""真理の福音書（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/truth を保存した HTML。
読み方の本体は sectioned.py（章＝見出し／節＝写本の番号 型）にある。

マリアの福音書と同じ型。節番号は Nag Hammadi 写本のページ番号で、16..43 が
見出しをまたいで連続する。そのため章 2 以降は途中のページから始まる。

  - 章 = 訳者が付けたセクション見出し（登場順に 1,2,3...）
  - 節 = 本文中のページ番号（空白で囲まれた数字）
"""

from __future__ import annotations

from .sectioned import PAGE_NUMBER, BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Gospel of Truth"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 625
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章 = セクション見出し（訳者が付けた小見出し、登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "Prologue",
    "Error and Forgetfulness",
    "The Gospel",
    "The Book of the Living",
    "The Return to Unity",
    "The Parable of the Jars",
    "Coming into Being",
    "The Parable of the Nightmares",
    "The Revelation of the Son",
    "The Parable of the Sheep",
    "Doing the Father's Will",
    "Restoring what was Needed",
    "The Father's Paradise",
    "The Father's Name",
    "The Place of Rest",
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


def parse_truth(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
