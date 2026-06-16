"""エノク書（Project Gutenberg pg77935 / R. H. Charles 英訳）の HTML パーサ。

入力: pg77935-images.html
出力: 正規化スキーマの dict（__init__.py 参照）と、気づいた点の警告リスト。

DB には一切触れない。取り込み前の確認はこの出力を validate / preview にかけて行う。
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup, Tag

# --- 書のメタデータ（取り込み先 Book に入る情報）---
BOOK_NAME = "The Book of Enoch"
TRANSLATION = "R. H. Charles (EN)"
ORDER = 700
SOURCE = "Project Gutenberg pg77935"

# --- 章マーカー: 段落先頭の <abbr> で、中身が「ローマ数字 + ピリオド」のもの（例: "CVIII."）---
_CHAP_ABBR = re.compile(r"^[IVXLCDM]+\.$")

# --- 節マーカー: 行頭か空白の後の「数字(1〜3桁) + 任意の副節文字 + ピリオド + 空白」---
#     1913 のような4桁は対象外。副節は "6a." と "6 a."（間にスペース）の両表記がある。
_VERSE = re.compile(r"(?:^|(?<=\s))(\d{1,3})\s?[a-e]?\.\s")

_ROMAN_VALUES = [
    ("M", 1000), ("CM", 900), ("D", 500), ("CD", 400),
    ("C", 100), ("XC", 90), ("L", 50), ("XL", 40),
    ("X", 10), ("IX", 9), ("V", 5), ("IV", 4), ("I", 1),
]


def roman_to_int(s: str) -> int | None:
    """ローマ数字文字列を整数に変換する。不正なら None。"""
    s = s.upper().rstrip(".")
    if not s or not re.fullmatch(r"[IVXLCDM]+", s):
        return None
    i = 0
    total = 0
    for sym, val in _ROMAN_VALUES:
        while s[i:i + len(sym)] == sym:
            total += val
            i += len(sym)
    return total if i == len(s) else None


def _normalize(text: str) -> str:
    """空白を整える。詩文の改行は残し、連続スペースだけ潰す。"""
    text = text.replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    return text.strip()


def _block_text(el: Tag) -> str:
    """段落/詩文ブロックを 1 つのテキストに変換する。

    詩文（.line を持つ）は各行を改行でつなぐ。それ以外は素のテキスト。
    ページ番号・脚注参照は事前に soup から除去済みである前提。
    """
    # 区切り文字は入れない。原文の text ノードに必要な空白は含まれており、
    # 区切りを入れると副節 "6a." が "6 a." に割れて節番号を取りこぼす。
    lines = el.select(".line")
    if lines:
        return _normalize("\n".join(ln.get_text("") for ln in lines))
    return _normalize(el.get_text(""))


# 節番号の許容ジャンプ幅。原文の欠番（数節飛ぶ）は受け入れつつ、
# 暦の数字（74章の 364・80 等）が節番号に化けるのは弾く。
_VERSE_GAP_TOLERANCE = 10


def _split_verses(stream: str) -> tuple[list[dict], list[int]]:
    """章のテキストを節に分割する。

    節番号は基本的に増加する性質を利用し、「直前より大きく、かつ飛びすぎない番号」
    だけを節の境界として採用する（暦の数字などの誤検出を本文として残せる）。
    戻り値: (節リスト, 不採用にした番号リスト)
    """
    candidates = [(m.start(), m.end(), int(m.group(1))) for m in _VERSE.finditer(stream)]

    # 受理ルール: これまでの最大節番号 + 許容幅まで。
    # Charles 版は節を前後に転置することがある（51章は 5a を 2〜4 の前に印刷）。
    # 最大値基準にすると後戻り（5 の後の 2）も拾え、暦の数字（80 等の大ジャンプ）は弾ける。
    accepted: list[tuple[int, int, int]] = []
    rejected: list[int] = []
    hi = 0
    for start, end, num in candidates:
        if 1 <= num <= max(hi, 1) + _VERSE_GAP_TOLERANCE:
            accepted.append((start, end, num))
            hi = max(hi, num)
        else:
            rejected.append(num)

    if not accepted:
        # 節番号が一切ない章（例: 第3章）は全体を 1 節として扱う
        text = _normalize(stream)
        return ([{"number": 1, "text": text}] if text else []), rejected

    # 同じ番号が複数回現れたら本文を結合する（副節 5a/5b や並行写本をまとめる）。
    by_number: dict[int, list[str]] = {}
    for i, (_start, end, num) in enumerate(accepted):
        next_start = accepted[i + 1][0] if i + 1 < len(accepted) else len(stream)
        text = _normalize(stream[end:next_start])
        by_number.setdefault(num, []).append(text)

    verses = [
        {"number": num, "text": "\n".join(t for t in by_number[num] if t)}
        for num in sorted(by_number)
    ]
    return verses, rejected


def parse_enoch(html: str) -> tuple[dict, list[str]]:
    """HTML 文字列を正規化スキーマの dict に変換する。

    戻り値: (data, warnings)
    """
    soup = BeautifulSoup(html, "html.parser")

    # ページ番号と脚注参照（<sup>[1]</sup>）を先に丸ごと除去する。
    # これらを残すと "32" 等の数字が節番号に誤認されるため。
    for junk in soup.select("span.pageno, sup"):
        junk.decompose()

    body = soup.body
    warnings: list[str] = []

    # 章ごとにテキスト断片を貯める（章番号 → [断片...]）。順序は登場順を別途保持。
    chapter_pieces: dict[int, list[str]] = {}
    chapter_order: list[int] = []
    current: int | None = None
    started = False

    for el in body.find_all(recursive=False):
        if not isinstance(el, Tag):
            continue

        text = el.get_text(" ", strip=True)
        classes = el.get("class", [])

        # --- 本文の開始位置を探す（"THE BOOK OF ENOCH ... I-XXXVI" 見出し）---
        if not started:
            if "THE BOOK OF ENOCH" in text and "XXXVI" in text:
                started = True
            continue

        # --- 本文の終端（巻末の脚注セクション）に来たら終了 ---
        if "footnote" in classes or "nf-center-c1" in classes:
            break

        # 章見出しラッパ <div class="chapter"> は中身が見出しのみなのでスキップ
        if el.name == "div" and "chapter" in classes:
            continue
        # 巻末の印刷所表記（小型大文字 span.sc）はスキップ
        if el.find("span", class_="sc"):
            continue

        is_heading = el.name in ("h1", "h2", "h3", "h4")
        is_poetry = bool(el.select(".line"))
        # 見出し・段落・詩文ブロック以外（範囲見出しラッパ等）は無視
        if not is_heading and el.name != "p" and not is_poetry:
            continue

        # 見出しはタイトル文なので本文には含めない（ただし章番号の取得には使う）
        block = "" if is_heading else _block_text(el)

        # --- 章番号の検出 ---
        # 章番号は (1) 見出し <h4> (2) 散文段落先頭 (3) 詩文行先頭 の <abbr> のいずれかに、
        # 単独のローマ数字（例 "XLVI."）として現れる。範囲（"XXXVIII-XLIV."）は対象外。
        # 章は 1..108 の連番なので「現在章 + 1」に一致するものだけを採用し、誤検出を防ぐ。
        # 章は物理的な登場順では前後する（Charles 版は週の黙示録 91〜93 章付近で
        # 章・節を並べ替えている）。番号を素直に採用し、既出の章には本文を追記する。
        # 最後に番号順へ並べ替えるので登場順の乱れは問題にならない。
        abbr = el.find("abbr")
        abbr_txt = abbr.get_text(strip=True) if abbr else ""
        if abbr and _CHAP_ABBR.match(abbr_txt) and (is_heading or block.startswith(abbr_txt)):
            num = roman_to_int(abbr_txt)
            if num is not None:
                current = num
                if num not in chapter_pieces:
                    chapter_pieces[num] = []
                    chapter_order.append(num)
                if not is_heading:  # 章マーカー文字列を本文から取り除く
                    block = _normalize(block[len(abbr_txt):])

        if is_heading or current is None:
            continue
        if block:
            chapter_pieces[current].append(block)

    # --- 章ごとに節へ分割（並べ替えられた章を番号順に戻す）---
    chapters: list[dict] = []
    for num in sorted(chapter_order):
        stream = "\n".join(chapter_pieces[num])
        verses, rejected = _split_verses(stream)
        if rejected:
            warnings.append(
                f"第{num}章: 連番から外れる数字 {rejected} を本文として残しました（節番号の誤検出か、原文の欠番の可能性）"
            )
        if not verses:
            warnings.append(f"第{num}章: 本文が空でした")
        chapters.append({"number": num, "verses": verses})

    data = {
        "book": BOOK_NAME,
        "translation": TRANSLATION,
        "order": ORDER,
        "source": SOURCE,
        "chapters": chapters,
    }
    return data, warnings
