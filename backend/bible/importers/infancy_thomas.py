"""トマスによる幼児福音書（gospels.net / Mark M. Mattison 英訳）の HTML パーサ。

入力: gospels.net/infancythomas を保存した HTML。
出力: 正規化スキーマの dict（__init__.py 参照）と、気づいた点の警告リスト。

DB には一切触れない。取り込み前の確認はこの出力を validate / preview にかけて行う。

マリアの福音書と同じ gospels.net 系だが、こちらは章・節が明示されている:

  - 章 = "Chapter N: タイトル" 段落（N=1..19、タイトルは books.ts 側に持つ）
  - 節 = 段落先頭の丸括弧数字 "(1)" "(2)" ...

末尾の "Notes" 以降は注釈で、そこにも "Chapter 13:" のような行が現れるため、
"Notes" 見出しに達したら本文を打ち切る。節検出は丸括弧数字限定なので、注記中の
裸の数字（写本番号 259 など）を節番号と誤検出することはない。
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Infancy Gospel of Thomas"
TRANSLATION = "Mark M. Mattison (EN)"
ORDER = 660
SOURCE = "gospels.net (Mark M. Mattison, public domain)"

# --- 章見出し: "Chapter 5: Joseph Confronts Jesus" → (番号, タイトル) ---
_CHAPTER = re.compile(r"^Chapter\s+(\d+)\s*:\s*(.*)$")

# --- 本文の終端マーカー（これ以降は注釈なので本文外）---
END_HEADING = "Notes"

# --- 節マーカー: 行頭か空白の後の丸括弧数字 "(1)" ---
_VERSE = re.compile(r"(?:^|(?<=\s))\((\d+)\)")


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
        if best < length < 20000:  # 2万字超は外枠とみなして除外
            best = length
            container = el
    if container is None:
        container = soup.body or soup

    return [p.get_text(" ", strip=True) for p in container.find_all("p")]


def _split_verses(stream: str) -> list[dict]:
    """章のテキストを節（丸括弧数字）で分割する。

    - 最初の節番号より前のテキスト（章冒頭の注記など）は最初の節に前置きする。
    - 節番号は増加する性質を使い、戻る数字は本文として残す。
    """
    matches = [(m.start(), m.end(), int(m.group(1))) for m in _VERSE.finditer(stream)]

    accepted: list[tuple[int, int, int]] = []
    hi = 0
    for start, end, num in matches:
        if num > hi:
            accepted.append((start, end, num))
            hi = num

    if not accepted:
        # 節番号が無い章（プロローグなど）は全体を 1 節として扱う
        text = _normalize(stream)
        return [{"number": 1, "text": text}] if text else []

    verses: list[dict] = []
    for i, (start, end, num) in enumerate(accepted):
        next_start = accepted[i + 1][0] if i + 1 < len(accepted) else len(stream)
        body = stream[end:next_start]
        if i == 0 and start > 0:
            body = stream[:start] + " " + body  # 章冒頭テキストを最初の節に含める
        text = _normalize(body)
        if text:
            verses.append({"number": num, "text": text})
    return verses


def parse_infancy_thomas(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    soup = BeautifulSoup(html, "html.parser")
    paragraphs = _find_body_paragraphs(soup)
    warnings: list[str] = []

    # 章ごとにテキスト断片を貯める（章番号 → [断片...]、登場順は chapter_order で保持）
    chapter_pieces: dict[int, list[str]] = {}
    chapter_titles: dict[int, str] = {}
    chapter_order: list[int] = []
    current: int | None = None

    for raw in paragraphs:
        text = _normalize(raw)
        if not text:
            continue

        if text == END_HEADING:
            break  # 注釈セクション以降は本文外

        m = _CHAPTER.match(text)
        if m:
            current = int(m.group(1))
            if current not in chapter_pieces:
                chapter_pieces[current] = []
                chapter_titles[current] = _normalize(m.group(2))
                chapter_order.append(current)
            continue

        if current is None:
            continue  # 最初の "Chapter 1:" より前（前書き・記号説明）は無視
        chapter_pieces[current].append(text)

    # --- 章ごとに節へ分割（番号順に整列）---
    chapters: list[dict] = []
    for num in sorted(chapter_order):
        verses = _split_verses("\n".join(chapter_pieces[num]))
        if not verses:
            warnings.append(f"第{num}章（{chapter_titles.get(num, '')}）: 本文が空でした")
        chapters.append({"number": num, "verses": verses})

    # 章タイトル一覧（books.ts の chapterTitles に転記する用）
    if chapter_order:
        titles = [chapter_titles[n] for n in sorted(chapter_order)]
        warnings.append("章タイトル（books.ts 用）: " + " / ".join(titles))

    data = {
        "book": BOOK_NAME,
        "translation": TRANSLATION,
        "order": ORDER,
        "source": SOURCE,
        "chapters": chapters,
    }
    return data, warnings
