"""聖書箇所の書き方（英語の略号・英語の書名・日本語の書名）を、このサービスの箇所へ直す。

解釈書ごとに箇所の書き方が違う。
  - CCEL の本 ……… OSIS 略号（"Gen.1.1"、"1Cor.13.4-1Cor.13.7"）
  - 注解データベース … 英語の書名（"1 Corinthians 13_4-7"）
  - 内村鑑三など ……… 日本語（「マタイ傳第十六章二一節」「ローマ1:1-7」）
どれも最後は Ref（書の slug・章・節・終わりの章・節）にそろえる。
書の slug は bible/data/canonical_books.json のものと同じ。
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Ref:
    """聖書の箇所（範囲）。verse が None なら章全体、chapter も None なら書全体。"""

    book: str
    chapter: int | None = None
    verse: int | None = None
    chapter_end: int | None = None
    verse_end: int | None = None

    def as_dict(self) -> dict:
        return {
            "book": self.book,
            "chapter": self.chapter,
            "verse": self.verse,
            "chapter_end": self.chapter_end if self.chapter_end is not None else self.chapter,
            "verse_end": self.verse_end if self.verse_end is not None else self.verse,
        }


# ---------------------------------------------------------------------------
# OSIS 略号 → slug（CCEL の scripRef osisRef で使われる）
# ---------------------------------------------------------------------------
OSIS_TO_SLUG = {
    "Gen": "genesis", "Exod": "exodus", "Lev": "leviticus", "Num": "numbers",
    "Deut": "deuteronomy", "Josh": "joshua", "Judg": "judges", "Ruth": "ruth",
    "1Sam": "1-samuel", "2Sam": "2-samuel", "1Kgs": "1-kings", "2Kgs": "2-kings",
    "1Chr": "1-chronicles", "2Chr": "2-chronicles", "Ezra": "ezra", "Neh": "nehemiah",
    "Esth": "esther", "Job": "job", "Ps": "psalms", "Prov": "proverbs",
    "Eccl": "ecclesiastes", "Song": "song-of-songs", "Isa": "isaiah", "Jer": "jeremiah",
    "Lam": "lamentations", "Ezek": "ezekiel", "Dan": "daniel", "Hos": "hosea",
    "Joel": "joel", "Amos": "amos", "Obad": "obadiah", "Jonah": "jonah", "Mic": "micah",
    "Nah": "nahum", "Hab": "habakkuk", "Zeph": "zephaniah", "Hag": "haggai",
    "Zech": "zechariah", "Mal": "malachi",
    "Matt": "matthew", "Mark": "mark", "Luke": "luke", "John": "john", "Acts": "acts",
    "Rom": "romans", "1Cor": "1-corinthians", "2Cor": "2-corinthians", "Gal": "galatians",
    "Eph": "ephesians", "Phil": "philippians", "Col": "colossians",
    "1Thess": "1-thessalonians", "2Thess": "2-thessalonians", "1Tim": "1-timothy",
    "2Tim": "2-timothy", "Titus": "titus", "Phlm": "philemon", "Heb": "hebrews",
    "Jas": "james", "1Pet": "1-peter", "2Pet": "2-peter", "1John": "1-john",
    "2John": "2-john", "3John": "3-john", "Jude": "jude", "Rev": "revelation",
    # 第二正典
    "Tob": "tobit", "Jdt": "judith", "Wis": "wisdom", "Sir": "sirach", "Bar": "baruch",
    "EpJer": "epistle-of-jeremy", "Sus": "susanna", "Bel": "bel-and-the-dragon",
    "1Macc": "1-maccabees", "2Macc": "2-maccabees", "3Macc": "3-maccabees",
    "4Macc": "4-maccabees", "1Esd": "1-esdras", "PrMan": "prayer-of-manasseh",
}

# ---------------------------------------------------------------------------
# 英語の書名 → slug（注解データベースのファイル名・Sefaria の書名）
# ---------------------------------------------------------------------------
ENGLISH_TO_SLUG = {
    "Genesis": "genesis", "Exodus": "exodus", "Leviticus": "leviticus", "Numbers": "numbers",
    "Deuteronomy": "deuteronomy", "Joshua": "joshua", "Judges": "judges", "Ruth": "ruth",
    "1 Samuel": "1-samuel", "2 Samuel": "2-samuel", "1 Kings": "1-kings", "2 Kings": "2-kings",
    "1 Chronicles": "1-chronicles", "2 Chronicles": "2-chronicles", "Ezra": "ezra",
    "Nehemiah": "nehemiah", "Esther": "esther", "Job": "job", "Psalms": "psalms",
    "Psalm": "psalms", "Proverbs": "proverbs", "Ecclesiastes": "ecclesiastes",
    "Song of Solomon": "song-of-songs", "Song of Songs": "song-of-songs", "Isaiah": "isaiah",
    "Jeremiah": "jeremiah", "Lamentations": "lamentations", "Ezekiel": "ezekiel",
    "Daniel": "daniel", "Hosea": "hosea", "Joel": "joel", "Amos": "amos",
    "Obadiah": "obadiah", "Jonah": "jonah", "Micah": "micah", "Nahum": "nahum",
    "Habakkuk": "habakkuk", "Zephaniah": "zephaniah", "Haggai": "haggai",
    "Zechariah": "zechariah", "Malachi": "malachi",
    "Tobit": "tobit", "Judith": "judith", "Wisdom": "wisdom", "Sirach": "sirach",
    "Baruch": "baruch", "1 Maccabees": "1-maccabees", "2 Maccabees": "2-maccabees",
    "Matthew": "matthew", "Mark": "mark", "Luke": "luke", "John": "john", "Acts": "acts",
    "Romans": "romans", "1 Corinthians": "1-corinthians", "2 Corinthians": "2-corinthians",
    "Galatians": "galatians", "Ephesians": "ephesians", "Philippians": "philippians",
    "Colossians": "colossians", "1 Thessalonians": "1-thessalonians",
    "2 Thessalonians": "2-thessalonians", "1 Timothy": "1-timothy", "2 Timothy": "2-timothy",
    "Titus": "titus", "Philemon": "philemon", "Hebrews": "hebrews", "James": "james",
    "1 Peter": "1-peter", "2 Peter": "2-peter", "1 John": "1-john", "2 John": "2-john",
    "3 John": "3-john", "Jude": "jude", "Revelation": "revelation",
}

# ---------------------------------------------------------------------------
# 日本語の書名 → slug
# 口語訳・文語訳の書名に加え、明治〜昭和の著者が使う略し方（ロマ書・マタイ傳など）も入れる。
# 「ヨハネ」「ユダ」のように人名と紛らわしい短い形は入れない（誤検出の元）。
# ---------------------------------------------------------------------------
JAPANESE_TO_SLUG: dict[str, str] = {}


def _ja(slug: str, *names: str) -> None:
    for n in names:
        JAPANESE_TO_SLUG[n] = slug


_ja("genesis", "創世記")
_ja("exodus", "出エジプト記", "出埃及記")
_ja("leviticus", "レビ記", "利未記")
_ja("numbers", "民数記", "民數記", "民數紀略", "民数紀略")
_ja("deuteronomy", "申命記")
_ja("joshua", "ヨシュア記", "約書亞記")
_ja("judges", "士師記")
_ja("ruth", "ルツ記", "路得記")
_ja("1-samuel", "サムエル記上", "サムエル前書", "撒母耳前書")
_ja("2-samuel", "サムエル記下", "サムエル後書", "撒母耳後書")
_ja("1-kings", "列王紀上", "列王記上", "列王紀略上")
_ja("2-kings", "列王紀下", "列王記下", "列王紀略下")
_ja("1-chronicles", "歴代志上", "歴代誌上", "歴代志略上", "歷代志略上")
_ja("2-chronicles", "歴代志下", "歴代誌下", "歴代志略下", "歷代志略下")
_ja("ezra", "エズラ記", "エズラ書")
_ja("nehemiah", "ネヘミヤ記", "ネヘミヤ書", "尼希米亞記")
_ja("esther", "エステル記", "エステル書", "以士帖書")
_ja("job", "ヨブ記")
_ja("psalms", "詩篇", "詩編")
_ja("proverbs", "箴言")
_ja("ecclesiastes", "伝道の書", "伝道之書", "傳道之書", "傳道の書", "伝道者の書")
_ja("song-of-songs", "雅歌")
_ja("isaiah", "イザヤ書", "以賽亞書")
_ja("jeremiah", "エレミヤ書", "エレミヤ記", "耶利米亞記")
_ja("lamentations", "哀歌", "耶利米亞哀歌", "エレミヤ哀歌")
_ja("ezekiel", "エゼキエル書", "以西結書")
_ja("daniel", "ダニエル書", "但以理書")
_ja("hosea", "ホセア書", "何西阿書")
_ja("joel", "ヨエル書", "約耳書")
_ja("amos", "アモス書", "亞麽士書")
_ja("obadiah", "オバデヤ書", "阿巴底亞書")
_ja("jonah", "ヨナ書", "約拿書")
_ja("micah", "ミカ書", "米迦書")
_ja("nahum", "ナホム書", "拿翁書")
_ja("habakkuk", "ハバクク書", "哈巴谷書")
_ja("zephaniah", "ゼパニヤ書", "西番雅書")
_ja("haggai", "ハガイ書", "哈基書")
_ja("zechariah", "ゼカリヤ書", "撒加利亞書")
_ja("malachi", "マラキ書", "馬拉基書")
_ja("matthew", "マタイによる福音書", "マタイ傳福音書", "マタイ伝福音書", "マタイ傳", "マタイ伝", "馬太傳")
_ja("mark", "マルコによる福音書", "マルコ傳福音書", "マルコ伝福音書", "マルコ傳", "マルコ伝", "馬可傳")
_ja("luke", "ルカによる福音書", "ルカ傳福音書", "ルカ伝福音書", "ルカ傳", "ルカ伝", "路加傳")
_ja("john", "ヨハネによる福音書", "ヨハネ傳福音書", "ヨハネ伝福音書", "ヨハネ傳", "ヨハネ伝", "約翰傳")
_ja("acts", "使徒行伝", "使徒行傳", "行伝", "行傳")
_ja("romans", "ローマ人への手紙", "ロマ人への書", "ロマ書", "ローマ書", "羅馬書")
_ja("1-corinthians", "コリント人への第一の手紙", "コリント人への前の書", "コリント前書", "哥林多前書")
_ja("2-corinthians", "コリント人への第二の手紙", "コリント人への後の書", "コリント後書", "哥林多後書")
_ja("galatians", "ガラテヤ人への手紙", "ガラテヤ人への書", "ガラテヤ書", "加拉太書")
_ja("ephesians", "エペソ人への手紙", "エペソ人への書", "エペソ書", "以弗所書")
_ja("philippians", "ピリピ人への手紙", "ピリピ人への書", "ピリピ書", "腓立比書")
_ja("colossians", "コロサイ人への手紙", "コロサイ人への書", "コロサイ書", "哥羅西書")
_ja("1-thessalonians", "テサロニケ人への第一の手紙", "テサロニケ人への前の書", "テサロニケ前書", "帖撒羅尼迦前書")
_ja("2-thessalonians", "テサロニケ人への第二の手紙", "テサロニケ人への後の書", "テサロニケ後書", "帖撒羅尼迦後書")
_ja("1-timothy", "テモテへの第一の手紙", "テモテヘの第一の手紙", "テモテへの前の書", "テモテ前書", "提摩太前書")
_ja("2-timothy", "テモテへの第二の手紙", "テモテヘの第二の手紙", "テモテへの後の書", "テモテ後書", "提摩太後書")
_ja("titus", "テトスへの手紙", "テトスヘの手紙", "テトスへの書", "テトス書", "提多書")
_ja("philemon", "ピレモンへの手紙", "ピレモンヘの手紙", "ピレモンへの書", "ピレモン書", "腓利門書")
_ja("hebrews", "ヘブル人への手紙", "ヘブル人への書", "ヘブル書", "ヘブライ書", "希伯來書")
_ja("james", "ヤコブの手紙", "ヤコブの書", "ヤコブ書", "雅各書")
_ja("1-peter", "ペテロの第一の手紙", "ペテロの前の書", "ペテロ前書", "彼得前書")
_ja("2-peter", "ペテロの第二の手紙", "ペテロの後の書", "ペテロ後書", "彼得後書")
_ja("1-john", "ヨハネの第一の手紙", "ヨハネの第一の書", "ヨハネ第一書", "ヨハネ一書", "約翰一書")
_ja("2-john", "ヨハネの第二の手紙", "ヨハネの第二の書", "ヨハネ第二書", "約翰二書")
_ja("3-john", "ヨハネの第三の手紙", "ヨハネの第三の書", "ヨハネ第三書", "約翰三書")
_ja("jude", "ユダの手紙", "ユダの書", "ユダ書", "猶大書")
_ja("revelation", "ヨハネの黙示録", "ヨハネの默示録", "黙示録", "默示録")


# ---------------------------------------------------------------------------
# 数字（算用数字・全角・漢数字）
# ---------------------------------------------------------------------------
_KANJI_DIGITS = {"〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
                 "六": 6, "七": 7, "八": 8, "九": 9}
_KANJI_UNITS = {"十": 10, "百": 100}
NUM_CHARS = "0-9０-９〇零一二三四五六七八九十百"


def parse_number(s: str) -> int:
    """「21」「２１」「二十一」「二一」「百五十」を整数にする。

    明治〜昭和の本は「二一節」のように位取りで漢数字を並べることがあるので、
    十・百を含まない漢数字列は位取りとして読む。
    """
    s = s.translate(str.maketrans("０１２３４５６７８９", "0123456789"))
    if s.isdigit():
        return int(s)
    if not any(c in _KANJI_UNITS for c in s):
        # 位取り（二一 → 21）
        return int("".join(str(_KANJI_DIGITS[c]) for c in s))
    total, current = 0, 0
    for c in s:
        if c in _KANJI_DIGITS:
            current = _KANJI_DIGITS[c]
        else:
            unit = _KANJI_UNITS[c]
            total += (current or 1) * unit
            current = 0
    return total + current


# ---------------------------------------------------------------------------
# 各形式の読み取り
# ---------------------------------------------------------------------------
_OSIS_PART = re.compile(r"^(?:Bible:)?([1-4]?[A-Za-z]+)\.(\d+)(?:\.(\d+))?$")


def parse_osis(osis_ref: str) -> list[Ref]:
    """CCEL の osisRef（"Bible:Gen.1.1"、"Bible:1Pet.5.1-1Pet.5.5"、空白区切りで複数）を読む。

    読めない略号（正典外の書など）は捨てる。
    """
    refs: list[Ref] = []
    for token in osis_ref.split():
        start, _, end = token.partition("-")
        m1 = _OSIS_PART.match(start)
        if not m1 or m1.group(1) not in OSIS_TO_SLUG:
            continue
        book = OSIS_TO_SLUG[m1.group(1)]
        ch, v = int(m1.group(2)), int(m1.group(3)) if m1.group(3) else None
        ch_end, v_end = ch, v
        if end:
            m2 = _OSIS_PART.match(end if "." in end else f"{m1.group(1)}.{ch}.{end}")
            if m2 and OSIS_TO_SLUG.get(m2.group(1)) == book:
                ch_end = int(m2.group(2))
                v_end = int(m2.group(3)) if m2.group(3) else None
        refs.append(Ref(book, ch, v, ch_end, v_end))
    return refs


_CDB_NAME = re.compile(r"^(?P<book>.+?) (?P<c1>\d+)_(?P<v1>\d+)(?:-(?:(?P<c2>\d+)_)?(?P<v2>\d+))?$")


def parse_cdb_filename(stem: str) -> Ref | None:
    """注解データベースのファイル名（拡張子なし）を読む。

    "Matthew 23_35" / "Matthew 23_35-41" / "1 Kings 19_10-20_3"
    """
    m = _CDB_NAME.match(stem)
    if not m or m.group("book") not in ENGLISH_TO_SLUG:
        return None
    c1, v1 = int(m.group("c1")), int(m.group("v1"))
    c2 = int(m.group("c2")) if m.group("c2") else c1
    v2 = int(m.group("v2")) if m.group("v2") else v1
    return Ref(ENGLISH_TO_SLUG[m.group("book")], c1, v1, c2, v2)


# 日本語の書名は長いものから試す（「ヨハネ傳」より「ヨハネ傳福音書」を先に）。
_JA_NAMES = "|".join(sorted(map(re.escape, JAPANESE_TO_SLUG), key=len, reverse=True))
_N = f"[{NUM_CHARS}]+"
# 範囲の区切り（1-7、一節より三節、一節乃至三節）
_RANGE = r"\s*(?:[-－‐―〜～]|乃至|より|至)\s*"
# 「マタイ傳第十六章二一節」「ロマ書八章二八節より三〇節」「詩篇百三十三篇」「ローマ1:1-7」「ローマ2章」
_JA_REF = re.compile(
    rf"(?P<book>{_JA_NAMES})\s*(?:の)?\s*(?:"
    # 算用数字のコロン表記（ローマ1:1-7、ローマ1:1-2:3）
    rf"(?P<c_a>[0-9０-９]+)[:：](?P<v_a>[0-9０-９]+)(?:{_RANGE}(?:(?P<c_a2>[0-9０-９]+)[:：])?(?P<v_a2>[0-9０-９]+))?"
    r"|"
    # 章・節（第十六章二一節、八章二八節より三〇節まで）
    rf"第?(?P<c_b>{_N})\s*[章篇](?:\s*第?(?P<v_b>{_N})\s*節(?:{_RANGE}第?(?P<v_b2>{_N})\s*節?)?)?"
    r")"
)


# 括弧の中の略した引用（藤井武・矢内原忠雄など）「（マラキ四の二）」「（黙示録二二の一六）」「（ヨハネ三の一六）」。
# 括弧の中に限るので、人名と紛らわしい短い書名（ヨハネ・ユダ）もここでは福音書・手紙として読む。
SHORT_JAPANESE_TO_SLUG: dict[str, str] = {
    **JAPANESE_TO_SLUG,
    "創世": "genesis", "出エジプト": "exodus", "レビ": "leviticus", "民数": "numbers", "申命": "deuteronomy",
    "ヨシュア": "joshua", "士師": "judges", "ルツ": "ruth", "サムエル前": "1-samuel", "サムエル後": "2-samuel",
    "列王上": "1-kings", "列王下": "2-kings", "歴代上": "1-chronicles", "歴代下": "2-chronicles",
    "エズラ": "ezra", "ネヘミヤ": "nehemiah", "エステル": "esther", "ヨブ": "job", "詩": "psalms",
    "伝道": "ecclesiastes", "イザヤ": "isaiah", "エレミヤ": "jeremiah", "エゼキエル": "ezekiel",
    "ダニエル": "daniel", "ホセア": "hosea", "ヨエル": "joel", "アモス": "amos", "オバデヤ": "obadiah",
    "ヨナ": "jonah", "ミカ": "micah", "ナホム": "nahum", "ハバクク": "habakkuk", "ゼパニヤ": "zephaniah",
    "ハガイ": "haggai", "ゼカリヤ": "zechariah", "マラキ": "malachi",
    "マタイ": "matthew", "マルコ": "mark", "ルカ": "luke", "ヨハネ": "john", "使徒": "acts",
    "ロマ": "romans", "ローマ": "romans", "コリント前": "1-corinthians", "コリント後": "2-corinthians",
    "Ⅰコリント": "1-corinthians", "Ⅱコリント": "2-corinthians", "ガラテヤ": "galatians",
    "エペソ": "ephesians", "ピリピ": "philippians", "コロサイ": "colossians",
    "テサロニケ前": "1-thessalonians", "テサロニケ後": "2-thessalonians", "テモテ前": "1-timothy",
    "テモテ後": "2-timothy", "テトス": "titus", "ピレモン": "philemon", "ヘブル": "hebrews",
    "ヤコブ": "james", "ペテロ前": "1-peter", "ペテロ後": "2-peter", "Ⅰペテロ": "1-peter", "Ⅱペテロ": "2-peter",
    "ヨハネ第一": "1-john", "ヨハネ第二": "2-john", "ヨハネ第三": "3-john", "Ⅰヨハネ": "1-john",
    "ユダ": "jude", "黙": "revelation",
}
_SHORT_NAMES = "|".join(sorted(map(re.escape, SHORT_JAPANESE_TO_SLUG), key=len, reverse=True))
_PAREN_REF = re.compile(
    rf"(?<=[（(、，,・])\s*(?P<book>{_SHORT_NAMES})\s*(?P<c>{_N})\s*の\s*(?P<v>{_N})"
    rf"(?:{_RANGE}(?P<v2>{_N}))?"
)


def find_parenthetical_refs(text: str) -> list[tuple[Ref, int, int]]:
    """「（マラキ四の二）」のような括弧内の略した引用を探す。戻り値は (Ref, 開始位置, 終了位置)。"""
    found = []
    for m in _PAREN_REF.finditer(text):
        c, v = parse_number(m.group("c")), parse_number(m.group("v"))
        v2 = parse_number(m.group("v2")) if m.group("v2") else v
        found.append((Ref(SHORT_JAPANESE_TO_SLUG[m.group("book")], c, v, c, v2), m.start(), m.end()))
    return found


_BARE_REF = re.compile(rf"第?(?P<c>{_N})\s*章\s*第?(?P<v>{_N})\s*節(?:{_RANGE}第?(?P<v2>{_N})\s*節?)?")


def find_bare_refs(text: str, default_book: str, taken: list[tuple[int, int]]) -> list[tuple[Ref, int, int]]:
    """書名の無い「八章二八節」を、その本が講じている書（default_book）の箇所として拾う。

    書名付きの引用の直後（30字以内）に続く「同じ書の別の節」かもしれないものは、
    どの書か決めきれないので拾わない。taken は書名付き引用の (開始, 終了) の一覧。
    """
    found = []
    for m in _BARE_REF.finditer(text):
        if any(s <= m.start() < e for s, e in taken):
            continue  # 書名付き引用の一部
        if any(0 <= m.start() - e <= 30 for _, e in taken):
            continue
        c, v = parse_number(m.group("c")), parse_number(m.group("v"))
        v2 = parse_number(m.group("v2")) if m.group("v2") else v
        found.append((Ref(default_book, c, v, c, v2), m.start(), m.end()))
    return found


def find_japanese_refs(text: str) -> list[tuple[Ref, int, int]]:
    """日本語の文章から「書名＋章（＋節）」の箇所を探す。戻り値は (Ref, 開始位置, 終了位置)。

    書名の無い「一章一節」だけの書き方は、どの書のことか決められないので拾わない。
    """
    found: list[tuple[Ref, int, int]] = []
    for m in _JA_REF.finditer(text):
        book = JAPANESE_TO_SLUG[m.group("book")]
        if m.group("c_a"):
            c = parse_number(m.group("c_a"))
            v = parse_number(m.group("v_a"))
            c2 = parse_number(m.group("c_a2")) if m.group("c_a2") else c
            v2 = parse_number(m.group("v_a2")) if m.group("v_a2") else v
            ref = Ref(book, c, v, c2, v2)
        elif m.group("c_b"):
            c = parse_number(m.group("c_b"))
            if m.group("v_b"):
                v = parse_number(m.group("v_b"))
                v2 = parse_number(m.group("v_b2")) if m.group("v_b2") else v
                ref = Ref(book, c, v, c, v2)
            else:
                ref = Ref(book, c)
        else:
            continue
        found.append((ref, m.start(), m.end()))
    return found
