"""イエスの語録・P.Oxy 5575（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/sayings-of-jesus-poxy-5575 を保存した HTML。
読み方の本体は sectioned.py にある。

オクシュリンコス出土のパピルス断片で、トマスの福音書と重なる語録を含む。
2024 年に公刊された新しい資料。章番号・節番号は原文に無い。

  - 章 = 断片の表裏（recto / verso、登場順に 1,2）
  - 節 = 段落の連番（章ごとに 1 から）

見出しに含まれる矢印（→ ↓）は写本の繊維の向きを示す記号。
末尾の "Notes" 以降は訳者による注なので本文外。
"""

from __future__ import annotations

from .sectioned import BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "Sayings of Jesus: P.Oxy 5575"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 615
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章 = 断片の見出し（登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "recto (→)",
    "verso (↓)",
]

# --- 本文の終端マーカー（これ以降は訳者による注なので本文外）---
END_HEADING = "Notes"

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    headings=tuple(SECTION_HEADINGS),
    verse_marker=None,  # 原文に節番号が無いので段落を数える
    end_heading=END_HEADING,
)


def parse_poxy5575(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
