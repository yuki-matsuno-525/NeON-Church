"""ストレンジャーの書（Allogenes / gospels.net・Mark M. Mattison 英訳）の設定。

入力: gospels.net/stranger を保存した HTML。
読み方の本体は sectioned.py（章＝見出し／節＝写本の番号 型）にある。

マリアの福音書と同じ型。底本は Codex Tchacos の第4文書で、写本上は 59〜66 ページ
の8ページ分。節番号はそのページ番号で、見出しをまたいで連続する。

  - 章 = 訳者が付けたセクション見出し（登場順に 1,2,3...）
  - 節 = 本文中のページ番号（空白で囲まれた数字）

63〜66 ページの傷みが激しく、最終章「Conclusion」の直前には「未知のページ数が
欠落」との注記が入る。訳者はこの最終章のページ番号を数字ではなく "Last Page" と
書いているが、この文書は 66 ページで終わるため、共通パーサの「番号が無い章は前の
章から続くページとみなす」規則がそのまま正しい番号（66）を与える。

訳注の見出しが無いので、本文の終端マーカーは持たない。
"""

from __future__ import annotations

from .sectioned import PAGE_NUMBER, BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Stranger's Book"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 635
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章 = セクション見出し（訳者が付けた小見出し、登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "Introduction",
    "The Temptation of Stranger",
    "The Transfiguration of Stranger",
    "The Ascent of Stranger",
    "Conclusion",
]

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    headings=tuple(SECTION_HEADINGS),
    verse_marker=PAGE_NUMBER,
    # 写本の開始ページ 59 は "59 The [Stranger's Book]" として最初の見出しより前に
    # 書かれており本文段落として拾えないので、開始位置として明示する。
    start_page=59,
    max_container_chars=25000,
)


def parse_stranger(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
