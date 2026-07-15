"""ユダの福音書（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/judas を保存した HTML。
読み方の本体は sectioned.py（章＝見出し／節＝写本の番号 型）にある。

マリアの福音書と同じ型。節番号は写本（Codex Tchacos）のページ番号で、本文中に
"33" のように現れ、33..58 が見出しをまたいで連続する。そのため章 2 以降は途中の
ページから始まる。

  - 章 = 訳者が付けたセクション見出し（登場順に 1,2,3...）
  - 節 = 本文中のページ番号（空白で囲まれた数字）
"""

from __future__ import annotations

from .sectioned import PAGE_NUMBER, BookSpec, parse_sectioned

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


def parse_judas(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
