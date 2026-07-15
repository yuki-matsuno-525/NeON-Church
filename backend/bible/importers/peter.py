"""ペテロの福音書（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/peter を保存した HTML。
読み方の本体は sectioned.py（章＝見出し／節＝写本の番号 型）にある。

マリアの福音書と同じ型だが、節番号は丸括弧 "(n)"。節番号は Akhmim 写本由来で
1..60 の連番が見出しをまたいで続く（章ごとには 1 に戻らない）。そのため章 2 以降は
途中の番号から始まる。

  - 章 = 訳者が付けたセクション見出し（登場順に 1,2,3...）
  - 節 = 段落先頭の丸括弧数字 "(1)" "(3)" ...

この書には訳注の見出しが無いので、本文の終端マーカーは持たない。
"""

from __future__ import annotations

from .sectioned import PARENTHESIZED, BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Gospel of Peter"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 670
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章 = セクション見出し（訳者が付けた小見出し、登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "Pilate and Herod",
    "Joseph Requests Jesus' Body",
    "The Lord is Tortured and Mocked",
    "The Lord is Crucified",
    "The Lord Dies",
    "The Lord is Buried",
    "People React",
    "The Tomb is Secured",
    "Men Descend from Heaven",
    "Emerging from the Tomb",
    "Reporting to Pilate",
    "Mary Magdalene Goes to the Tomb",
    "Encounter at the Tomb",
    "The Disciples Depart",
]

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    headings=tuple(SECTION_HEADINGS),
    verse_marker=PARENTHESIZED,
)


def parse_peter(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
