"""「章＝訳者の見出し／節＝写本の番号」型テキストの共通パーサ。

gospels.net の Mattison 訳はほとんどがこの形をしている（マリア・ユダ・ペテロ・
ピリポ・真理・ヤコブの秘密の書・ストレンジャーの書）。書ごとに違うのは実質この
3点だけなので、書ごとのモジュールは BookSpec を1つ書いて parse_sectioned() に
渡すだけでよい。

  - 節番号の書き方   … 写本のページ番号 "51" か、丸括弧の節番号 "(1)" か、
                       原文に番号が無いので段落を数える（verse_marker=None）か
  - 章の切り方       … 次のどちらか
                       headings        = 見出しの並び順がそのまま章番号
                       heading_pattern = 見出し自身が章番号を持つ
                                         （"Chapter 5: ..." / "Saying 12: ..."）
  - 本文の終わり     … 訳注や奥付が始まる見出し（あれば）

DB には一切触れない。出力は正規化スキーマ（__init__.py 参照）の dict と、
気づいた点の警告リスト。取り込み前の確認は validate / preview で行う。
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass, field

from bs4 import BeautifulSoup

# --- 節マーカーの型 ---
# 写本のページ番号: 空白（か先頭）で囲まれた1〜2桁の数字。例: マリア・ユダ・ピリポ
PAGE_NUMBER = re.compile(r"(?:^|(?<=\s))(\d{1,2})(?=\s|$)")
# 丸括弧の節番号: 例 "(1)"。例: ペテロ
PARENTHESIZED = re.compile(r"(?:^|(?<=\s))\((\d+)\)")

# 本文に残したいが中の数字を節番号と誤検出されたくない定型句。
# 例: "Pages 11 through 14 are missing."（マリア）
MISSING_PAGES_NOTE = re.compile(
    r"Pages?\s+\d+(?:\s+through\s+\d+)?\s+(?:are|is)\s+missing\.?", re.I
)

_PLACEHOLDER = "\x00KEEP{}\x00"
_PLACEHOLDER_RE = re.compile(r"\x00KEEP(\d+)\x00")


@dataclass(frozen=True)
class BookSpec:
    """1つの書をこの型のテキストとして読むための設定。"""

    book: str  # 取り込み先 Book.name
    translation: str  # 取り込み先 Book.translation
    order: int  # 表示順
    source: str  # 出典（どこから取ったか）
    # 章の切り方その1: セクション見出しの並び順がそのまま章番号（1,2,3...）
    headings: tuple[str, ...] = ()
    # 章の切り方その2: 見出し自身が章番号を持つ書のための正規表現。
    # 名前付きグループ number（章番号）と、あれば title（章名）を取る。
    # 例: r"^Chapter\s+(?P<number>\d+)\s*:\s*(?P<title>.*)$"
    heading_pattern: re.Pattern | None = None
    # heading_pattern を使う書で、番号を持たない特別な見出しに章番号を与える。
    # 例: トマスの福音書の "Prologue" は第0章（語番号と章番号を一致させるため）。
    special_headings: Mapping[str, int] = field(default_factory=dict)
    # 節番号の書き方。None なら原文に節番号が無い書とみなし、段落を 1 節ずつ数える。
    verse_marker: re.Pattern | None = PAGE_NUMBER
    # 節番号が章ごとに 1 へ戻る書は True（"Chapter 2:" の下がまた (1) から始まる）。
    # 既定は False＝写本のページ番号のように見出しをまたいで連続する書。
    verses_restart_each_chapter: bool = False
    end_heading: str | None = None  # これ以降は本文外（訳注・奥付）
    keep_notes: tuple[re.Pattern, ...] = ()  # 数字を誤検出させたくない定型句
    # 本文が始まるページ番号。写本の冒頭ページ番号が最初の見出しより前に書かれて
    # いて拾えない書のために、開始位置を明示する（例: ストレンジャーの書の 59）。
    start_page: int = 0
    # 引用符 ’ を ' にそろえるか。既に取り込み済みの書の本文を変えないため、
    # 書ごとに従来の挙動を保つ。新しい書は True（' にそろえる）でよい。
    normalize_quotes: bool = True
    # 本文コンテナ判定の上限文字数（これを超える要素は外枠とみなす）
    max_container_chars: int = 20000


def _normalize(text: str, spec: BookSpec) -> str:
    """空白を整える（必要なら引用符の字種もそろえる）。"""
    text = text.replace("\xa0", " ")
    if spec.normalize_quotes:
        text = text.replace("’", "'")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _find_body_paragraphs(soup: BeautifulSoup, spec: BookSpec) -> list[str]:
    """本文の段落テキスト列を返す。

    Squarespace 由来でページ全体に装飾要素が多いため、最もテキスト量の多い
    コンテナ（極端に大きいものは外枠なので除く）を本文とみなし、その <p> を拾う。
    """
    for junk in soup.select("script, style, nav, header, footer"):
        junk.decompose()

    container = None
    best = 0
    for el in soup.find_all(["div", "section", "article"]):
        length = len(el.get_text(strip=True))
        if best < length < spec.max_container_chars:
            best = length
            container = el
    if container is None:
        container = soup.body or soup

    return [p.get_text(" ", strip=True) for p in container.find_all("p")]


def _mask(stream: str, spec: BookSpec, store: list[str]) -> str:
    """keep_notes に当たる定型句をプレースホルダに退避する。"""

    def repl(m: re.Match) -> str:
        store.append(m.group(0))
        return _PLACEHOLDER.format(len(store) - 1)

    for pattern in spec.keep_notes:
        stream = pattern.sub(repl, stream)
    return stream


def _restore(text: str, store: list[str]) -> str:
    """退避した定型句を本文に戻す。"""
    if not store:
        return text
    return _PLACEHOLDER_RE.sub(lambda m: store[int(m.group(1))], text)


def _number_paragraphs(pieces: list[str], spec: BookSpec) -> list[dict]:
    """段落を 1 節ずつ数える（原文に節番号が無い書のため）。

    節番号は写本に由来しないこちら側の採番なので、章ごとに 1 から始める。
    """
    verses: list[dict] = []
    for piece in pieces:
        text = _normalize(piece, spec)
        if text:
            verses.append({"number": len(verses) + 1, "text": text})
    return verses


def _split_verses(
    stream: str, spec: BookSpec, store: list[str], hi: int
) -> tuple[list[dict], int]:
    """章のテキストを節番号で分割する。

    節番号（写本のページ番号など）は見出しをまたいで連続するので、直前の章までに
    見た最大の番号 hi を受け取り、更新して返す。

    - 最初の節番号より前のテキスト（前の章から続く番号なしの段落）は、
      最初の節に前置きして捨てない。
    - 番号は増加する性質を使い、戻る数字は本文として残す（誤検出対策）。
    - 章の中に番号が1つも無いときは、前の章の続きのページなので hi をそのまま使う。
    """
    matches = [
        (m.start(), m.end(), int(m.group(1))) for m in spec.verse_marker.finditer(stream)
    ]

    accepted: list[tuple[int, int, int]] = []
    for start, end, num in matches:
        if num > hi:
            accepted.append((start, end, num))
            hi = num

    if not accepted:
        text = _restore(_normalize(stream, spec), store)
        # hi が 0 のまま（まだ1つも番号を見ていない）なら 1 から始める
        return ([{"number": hi or 1, "text": text}] if text else []), hi

    verses: list[dict] = []
    for i, (start, end, num) in enumerate(accepted):
        next_start = accepted[i + 1][0] if i + 1 < len(accepted) else len(stream)
        body = stream[end:next_start]
        if i == 0 and start > 0:
            body = stream[:start] + " " + body  # 章冒頭の番号なしテキストを最初の節に含める
        text = _restore(_normalize(body, spec), store)
        if text:
            verses.append({"number": num, "text": text})
    return verses, hi


def _match_heading(text: str, spec: BookSpec) -> tuple[int | None, str] | None:
    """段落が章見出しなら (章番号, 章名) を、見出しでなければ None を返す。

    章番号は heading_pattern（見出し自身が番号を持つ）の書でだけここで決まる。
    headings（並び順が章番号）の書は None を返し、呼び出し側が登場順を振る。
    """
    if spec.heading_pattern is not None:
        if text in spec.special_headings:
            return spec.special_headings[text], text
        m = spec.heading_pattern.match(text)
        if m:
            title = (m.groupdict().get("title") or "").strip()
            return int(m.group("number")), title or text
        return None

    if text in spec.headings:
        return None, text
    return None


def parse_sectioned(html: str, spec: BookSpec) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    soup = BeautifulSoup(html, "html.parser")
    paragraphs = _find_body_paragraphs(soup, spec)
    warnings: list[str] = []

    headings = set(spec.headings)
    chapter_pieces: list[list[str]] = []
    chapter_names: list[str] = []
    chapter_numbers: list[int] = []  # heading_pattern を使う書の章番号
    started = False

    for raw in paragraphs:
        text = _normalize(raw, spec)
        if not text:
            continue

        if spec.end_heading is not None and text == spec.end_heading:
            break  # これ以降は訳注・奥付なので本文外

        heading = _match_heading(text, spec)
        if heading is not None:
            number, name = heading
            if number is None:
                number = len(chapter_numbers) + 1  # 見出しの登場順が章番号
            elif number in chapter_numbers:
                # 同じ章番号の見出しが2度出るのは異版・付録。本文が混ざるので取らない。
                warnings.append(f"第{number}章の見出しが重複（{name}）: 読み飛ばしました")
                started = False
                continue
            chapter_pieces.append([])
            chapter_names.append(name)
            chapter_numbers.append(number)
            started = True
            continue

        if not started:
            continue  # 最初の見出しより前（前書き・記号説明）は無視
        chapter_pieces[-1].append(text)

    # --- 章ごとに節へ分割 ---
    # 節番号は見出しをまたいで連続するので、最大値を章から章へ持ち回る。
    chapters: list[dict] = []
    hi = spec.start_page
    for i, pieces in enumerate(chapter_pieces):
        if spec.verse_marker is None:
            verses = _number_paragraphs(pieces, spec)
        else:
            store: list[str] = []
            stream = _mask("\n".join(pieces), spec, store)
            if spec.verses_restart_each_chapter:
                hi = spec.start_page  # 章ごとに番号が 1 へ戻る書
            verses, hi = _split_verses(stream, spec, store, hi)
        if not verses:
            warnings.append(f"第{chapter_numbers[i]}章（{chapter_names[i]}）: 本文が空でした")
        chapters.append({"number": chapter_numbers[i], "verses": verses})

    chapters.sort(key=lambda c: c["number"])

    missing_sections = [h for h in spec.headings if h not in set(chapter_names)]
    if missing_sections:
        warnings.append(f"見つからなかったセクション見出し: {missing_sections}")

    # 章名一覧（フロントの books.ts の chapterTitles に転記する用）
    if spec.heading_pattern is not None and chapter_names:
        ordered = [n for _, n in sorted(zip(chapter_numbers, chapter_names))]
        warnings.append("章タイトル（books.ts 用）: " + " / ".join(ordered))

    data = {
        "book": spec.book,
        "translation": spec.translation,
        "order": spec.order,
        "source": spec.source,
        "chapters": chapters,
    }
    return data, warnings
