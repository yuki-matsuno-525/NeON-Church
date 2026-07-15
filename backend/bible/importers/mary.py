"""マリアの福音書（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/mary を保存した HTML。
読み方の本体は sectioned.py（章＝見出し／節＝写本の番号 型）にある。

この書は章番号・節番号を持たない。原文は写本の「ページ番号」(7〜19, 1〜6 と
11〜14 は欠落) と、訳者が付けたセクション見出しで区切られている。そこで:

  - 章 = セクション見出し（登場順に 1,2,3...、見出し文は books.ts 側に持つ）
  - 節 = ページ番号（本文中に "7" や "Don't 9 lay down" の形で現れる）

ページ番号は見出しをまたいで連続するため、章 2 以降は途中の番号から始まる。
"""

from __future__ import annotations

from .sectioned import MISSING_PAGES_NOTE, PAGE_NUMBER, BookSpec, parse_sectioned

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

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    headings=tuple(SECTION_HEADINGS),
    verse_marker=PAGE_NUMBER,
    end_heading=END_HEADING,
    # "Pages 11 through 14 are missing." の数字をページ番号と誤検出させない
    keep_notes=(MISSING_PAGES_NOTE,),
    # 取り込み済みの本文を変えないため、この書は引用符をそのまま残す
    normalize_quotes=False,
)


def parse_mary(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
