"""USFM 形式のテキストを正規化スキーマに変換する共通パーサ。

USFM は聖書テキストの標準的な配布形式で、行頭のマーカーで構造を表す。
eBible.org が配布する Brenton 七十人訳（英訳）がこの形式。

    \\id TOB - Brenton English Septuagint
    \\h Tobit                 ← 書名
    \\c 1                     ← 章
    \\p                       ← 段落の切れ目（本文の構造には使わない）
    \\v 1 The book of the words of Tobit, the \\add son\\add* of Tobiel,
                              ↑ 節番号と本文。\\add…\\add* は訳者が補った語

節の本文に混ざる文字マーカーは中身だけ残して外す:

    \\add ... \\add*   訳者が補った語（印刷版では斜体）
    \\sc ... \\sc*     小文字大文字（印刷版のデザイン指定）

枝番の節:

    Brenton はギリシャ語本文の節の切れ目に合わせて "\\v 7a" のような枝番を使う。
    例えばトビト 4 章は 1〜7, 7a〜7l, 19〜21 と並び、7a〜7l は他の版で 8〜18 に
    あたる本文にあたる。このアプリの節番号は整数なので、枝番の節は親の節（7）に
    本文をつないで 1 つの節にする。本文は落とさないが、7a 単独では引用できない。
    どの節をつないだかは警告に出す。

DB には一切触れない。出力は正規化スキーマ（__init__.py 参照）の dict と警告リスト。
"""

from __future__ import annotations

import re

# --- 行頭マーカー ---
_CHAPTER = re.compile(r"^\\c\s+(\d+)", re.M)
# 節番号には枝番が付くことがある（"\v 7a"）。下の「枝番の節」を参照。
_VERSE = re.compile(r"^\\v\s+(\d+)([a-z]?)\s?", re.M)
# 書名（\h が最も素直な書名。\toc1 は長い正式名、\mt1 は大文字の飾り見出し）
_HEADING = re.compile(r"^\\h\s+(.+)$", re.M)

# --- 節の本文から外す文字マーカー（中身は残す）---
_INLINE_MARKERS = re.compile(r"\\(?:add|sc|nd|it|bd|em|qt|wj)\*?")
# --- 節の本文に紛れ込む段落系マーカー（中身ごと落として構わない）---
_PARAGRAPH_MARKERS = re.compile(r"^\\(?:p|m|nb|b|q\d?|pi\d?|li\d?|d|s\d?|ms\d?)\b.*$", re.M)


def _clean(text: str) -> str:
    """節の本文から USFM マーカーを外して空白を整える。"""
    text = _PARAGRAPH_MARKERS.sub(" ", text)
    text = _INLINE_MARKERS.sub("", text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def book_name(usfm_text: str) -> str | None:
    """USFM の \\h から書名を返す。無ければ None。"""
    m = _HEADING.search(usfm_text)
    return m.group(1).strip() if m else None


def parse_usfm(
    usfm_text: str, *, book: str, translation: str, order: int, source: str
) -> tuple[dict, list[str]]:
    """USFM 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    warnings: list[str] = []

    # --- 章ごとに切る ---
    chapter_marks = list(_CHAPTER.finditer(usfm_text))
    if not chapter_marks:
        return (
            {"book": book, "translation": translation, "order": order,
             "source": source, "chapters": []},
            [r"\c（章）が1つも見つかりませんでした"],
        )

    chapters: list[dict] = []
    for i, cm in enumerate(chapter_marks):
        number = int(cm.group(1))
        end = chapter_marks[i + 1].start() if i + 1 < len(chapter_marks) else len(usfm_text)
        body = usfm_text[cm.end() : end]

        # --- 章の中を節ごとに切る ---
        verse_marks = list(_VERSE.finditer(body))
        verses: list[dict] = []
        by_number: dict[int, dict] = {}
        merged: list[str] = []
        for j, vm in enumerate(verse_marks):
            vend = verse_marks[j + 1].start() if j + 1 < len(verse_marks) else len(body)
            text = _clean(body[vm.end() : vend])
            if not text:
                continue
            num, suffix = int(vm.group(1)), vm.group(2)
            if suffix and num in by_number:
                # 枝番の節（"7a"）は親の節（7）の続きなので本文をつなぐ
                by_number[num]["text"] += " " + text
                merged.append(f"{num}{suffix}")
                continue
            verse = {"number": num, "text": text}
            verses.append(verse)
            by_number[num] = verse

        if merged:
            warnings.append(
                f"第{number}章: 枝番の節を親の節に連結しました（{', '.join(merged)}）"
            )

        if not verses:
            warnings.append(f"第{number}章: 節が1つもありませんでした")
        chapters.append({"number": number, "verses": verses})

    data = {
        "book": book,
        "translation": translation,
        "order": order,
        "source": source,
        "chapters": chapters,
    }
    return data, warnings
