"""知られざる福音書・エゲルトン・パピルス2（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/egerton を保存した HTML。
読み方の本体は sectioned.py にある。

正典のどの福音書にも属さない断片で、写本は4つの断片しか残っていない。
章番号・節番号は原文に無く、訳者は断片の表裏で区切っている。

  - 章 = 断片の表裏（"Fragment 1, verso (→)" など、登場順に 1..4）
  - 節 = 段落の連番（章ごとに 1 から）

見出しに含まれる矢印（→ ↓）は写本の繊維の向きを示す記号。
"""

from __future__ import annotations

from .sectioned import BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Unknown Gospel: Egerton Papyrus 2"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 640
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章 = 断片の見出し（登場順）---
# 章番号はこの順序、章名（表示用）はフロントの books.ts に同じ順で持つ。
SECTION_HEADINGS = [
    "Fragment 1, verso (↓)",
    "Fragment 1, recto (→)",
    "Fragment 2, recto (→)",
    "Fragment 2, verso (↓)",
]

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    headings=tuple(SECTION_HEADINGS),
    verse_marker=None,  # 原文に節番号が無いので段落を数える
)


def parse_egerton(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
