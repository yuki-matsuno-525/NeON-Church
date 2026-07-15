"""トマスの福音書（gospels.net / Mark M. Mattison 英訳）の設定。

入力: gospels.net/thomas を保存した HTML。
読み方の本体は sectioned.py にある。

この書は物語ではなく 114 の語録（Saying）の集まりで、"Thomas 114" のように
語番号で引用される。そこで章番号を語番号にそのまま一致させる。

  - 章 = 語番号（Saying 1..114）。冒頭の Prologue だけは第 0 章
  - 節 = 段落の連番（原文に節番号は無い）

Prologue を第 1 章にすると以降が1つずつずれて「トマス114」が第115章になって
しまうため、Prologue を第 0 章に置いて語番号と章番号を完全に一致させている。

底本は Nag Hammadi 写本 II,2 のコプト語テキスト。
"""

from __future__ import annotations

import re

from .sectioned import BookSpec, parse_sectioned

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Gospel of Thomas"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 610
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章見出し: "Saying 12: The Leadership of James" → 章番号 12 / 章名 "The Leadership of James" ---
HEADING = re.compile(r"^Saying\s+(?P<number>\d+)\s*:\s*(?P<title>.*)$")

# --- 番号を持たない見出し（Prologue は第0章）---
SPECIAL_HEADINGS = {"Prologue": 0}

# --- 本文の終端マーカー（これ以降は訳者による注なので本文外）---
END_HEADING = "Notes on Translation"

SPEC = BookSpec(
    book=BOOK_NAME,
    translation=TRANSLATION,
    order=ORDER,
    source=SOURCE,
    heading_pattern=HEADING,
    special_headings=SPECIAL_HEADINGS,
    verse_marker=None,  # 原文に節番号が無いので段落を数える
    end_heading=END_HEADING,
    max_container_chars=30000,
)


def parse_thomas(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    return parse_sectioned(html, SPEC)
