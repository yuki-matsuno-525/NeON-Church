"""秘密のマルコの福音書（gospels.net / Samuel Zinner 英訳）の設定。

入力: gospels.net/secret-gospel-of-mark を保存した HTML。
読み方の本体は sectioned.py（章＝見出し／節＝写本の番号 型）にある。

この書だけは訳者が Mark M. Mattison ではなく Samuel Zinner（同じくパブリック
ドメインで公開）。本文は「アレクサンドリアのクレメンスに帰される手紙」で、その
引用として秘密のマルコ福音書が現れる。

原文（Mar Saba 写本）に節番号が無いため、節はこちら側で段落を数えて付ける
（verse_marker=None）。訳注の見出しが無いので終端マーカーは持たない。

  - 章 = 訳者が付けたセクション見出し（登場順に 1,2,3...）
  - 節 = 段落の連番（章ごとに 1 から）
"""

from __future__ import annotations

from .sectioned import BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Secret Gospel of Mark"
TRANSLATION = "Samuel Zinner (EN)"
ORDER = 645
SOURCE = "gospels.net (Samuel Zinner, public domain)"

# --- 章 = セクション見出し（訳者が付けた小見出し、登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "Salutation",
    "The Doctrines of the Carpocratians",
    "A More Spiritual Gospel",
    "Blasphemous Interpretation",
    "The Secret Gospel",
]

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    headings=tuple(SECTION_HEADINGS),
    verse_marker=None,  # 原文に節番号が無いので段落を数える
    max_container_chars=25000,
)


def parse_secret_mark(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
