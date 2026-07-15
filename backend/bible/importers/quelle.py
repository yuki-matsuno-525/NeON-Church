"""Q資料（gospels.net / Mark M. Mattison 英訳）のパーサ。

入力: gospels.net/quelle を保存した HTML。
出力: 正規化スキーマの dict（__init__.py 参照）と、気づいた点の警告リスト。

Q はマタイとルカが共通して使ったと考えられている語録資料で、写本は1つも
残っていない（マタイとルカの本文から復元された仮説上の書）。そのため章節は
写本由来ではなく、慣例に従って**ルカの章節番号**をそのまま使う。

  - 章 = ルカの章番号（3〜22。Q はルカ全体には対応しないので 1,2 は無い）
  - 節 = ルカの節番号（Q に含まれる節だけなので飛び飛びになる）

本文中の参照記号は3種類ある:

    (QLk 3:2)  本文の開始（章と節）
    (22:28)    章が変わるところ（章と節）
    (20)       同じ章の中の次の節

他の書と違い章＝見出しではないので、sectioned.py には乗らない。
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Gospel of Q"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 601
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 本文の開始位置: 最初の "(QLk 3:2)" ---
_BODY_START = re.compile(r"\(QLk\s+\d+:\d+\)")

# --- 参照記号: "(QLk 3:2)" / "(22:28)" / "(20)" ---
#     章が無いものは直前の章の続き。数字だけの丸括弧なので、
#     "(the rich man)" のような編集挿入とは取り違えない。
_REF = re.compile(r"\((?:QLk\s+)?(?:(?P<chapter>\d+):)?(?P<verse>\d+)\)")


def _normalize(text: str) -> str:
    """空白を整える。"""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _find_body_paragraphs(soup: BeautifulSoup) -> list[str]:
    """本文の段落テキスト列を返す（最もテキスト量の多いコンテナの <p>）。"""
    for junk in soup.select("script, style, nav, header, footer"):
        junk.decompose()

    container = None
    best = 0
    for el in soup.find_all(["div", "section", "article"]):
        length = len(el.get_text(strip=True))
        if best < length < 30000:  # 極端に大きいものは外枠とみなして除外
            best = length
            container = el
    if container is None:
        container = soup.body or soup

    return [p.get_text(" ", strip=True) for p in container.find_all("p")]


def parse_quelle(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    soup = BeautifulSoup(html, "html.parser")
    paragraphs = [_normalize(p) for p in _find_body_paragraphs(soup)]
    stream = "\n".join(p for p in paragraphs if p)
    warnings: list[str] = []

    # 最初の "(QLk 3:2)" より前は前書き・記号説明なので落とす
    start = _BODY_START.search(stream)
    if start is None:
        return (
            {
                "book": BOOK_NAME,
                "translation": TRANSLATION,
                "order": ORDER,
                "source": SOURCE,
                "chapters": [],
            },
            ["本文の開始 (QLk n:n) が見つかりませんでした"],
        )
    stream = stream[start.start() :]

    # --- 参照記号ごとに本文を切り出す ---
    refs = list(_REF.finditer(stream))
    chapter_verses: dict[int, list[dict]] = {}
    chapter: int | None = None

    for i, m in enumerate(refs):
        if m.group("chapter") is not None:
            chapter = int(m.group("chapter"))
        if chapter is None:
            continue  # 章が一度も出ていない（本文開始前）
        verse = int(m.group("verse"))
        end = refs[i + 1].start() if i + 1 < len(refs) else len(stream)
        text = _normalize(stream[m.end() : end])
        if not text:
            continue
        verses = chapter_verses.setdefault(chapter, [])
        if any(v["number"] == verse for v in verses):
            warnings.append(f"{chapter}:{verse} が重複しています: 後ろの本文を連結しました")
            existing = next(v for v in verses if v["number"] == verse)
            existing["text"] = existing["text"] + "\n" + text
            continue
        verses.append({"number": verse, "text": text})

    chapters = [
        {"number": num, "verses": sorted(chapter_verses[num], key=lambda v: v["number"])}
        for num in sorted(chapter_verses)
    ]

    if chapters:
        warnings.append(
            "章はルカの章番号（Q はルカ全体に対応しないので 1 始まりでも連番でもない）: "
            + ", ".join(str(c["number"]) for c in chapters)
        )

    data = {
        "book": BOOK_NAME,
        "translation": TRANSLATION,
        "order": ORDER,
        "source": SOURCE,
        "chapters": chapters,
    }
    return data, warnings
