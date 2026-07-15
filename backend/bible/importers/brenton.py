"""Brenton 七十人訳（英訳）の第二正典 14 冊の設定。

底本・訳ともパブリックドメイン。Sir Lancelot C. L. Brenton が七十人訳
（ギリシャ語旧約）を英訳したもので、1851 年出版。eBible.org が USFM 形式で
配布している（ファイル内の表記: "Published in 1851, and now in the Public Domain."）。

読み方の本体は usfm.py にある。この書たちは章・節ともに原文が番号を持つので、
他の外典と違って章立てで悩むところは無い。

ここで入れるのは**第二正典だけ**（旧約39冊・新約27冊は ibibles から投入済み）。
Brenton の "Esther (Greek)" と "Daniel (Greek)" は既存の esther / daniel と同じ書の
ギリシャ語形で章立てが違い、さらに Daniel (Greek) はスザンナ・ベルと竜と内容が
重なるため、ここには含めない。
"""

from __future__ import annotations

from .usfm import parse_usfm

TRANSLATION = "L. C. L. Brenton (EN)"
SOURCE = "eBible.org eng-Brenton USFM (Brenton 1851, public domain)"

# USFM ファイルの識別子 → (slug, 書名, 表示順)
#
# 表示順は USFM の標準の書番号をそのまま使う。旧約が 1〜39、新約が 101〜127 なので、
# 41〜59 はちょうどその間に収まり、聖書の並び順どおりになる。
# 書名は USFM の \h と一致させる（usfm.book_name() で検証する）。
BOOKS: dict[str, tuple[str, str, int]] = {
    "TOB": ("tobit", "Tobit", 41),
    "JDT": ("judith", "Judith", 42),
    "WIS": ("wisdom", "Wisdom Of Solomon", 45),
    "SIR": ("sirach", "Sirach", 46),
    "BAR": ("baruch", "Baruch", 47),
    "LJE": ("epistle-of-jeremy", "Epistle of Jeremy", 48),
    "SUS": ("susanna", "Susanna", 50),
    "BEL": ("bel-and-the-dragon", "Bel and the Dragon", 51),
    "1MA": ("1-maccabees", "Maccabees I", 52),
    "2MA": ("2-maccabees", "Maccabees II", 53),
    "1ES": ("1-esdras", "Esdras I", 54),
    "MAN": ("prayer-of-manasseh", "Prayer of Manasses", 55),
    "3MA": ("3-maccabees", "Maccabees III", 57),
    "4MA": ("4-maccabees", "Maccabees IV", 59),
}


def parse_brenton(usfm_text: str, usfm_id: str) -> tuple[dict, list[str]]:
    """Brenton の USFM 1 冊を正規化スキーマの dict に変換する。

    usfm_id は BOOKS のキー（"TOB" など）。
    戻り値: (data, warnings)
    """
    if usfm_id not in BOOKS:
        raise ValueError(f"Brenton の第二正典に無い書です: {usfm_id}")

    _slug, name, order = BOOKS[usfm_id]
    return parse_usfm(
        usfm_text, book=name, translation=TRANSLATION, order=order, source=SOURCE
    )
