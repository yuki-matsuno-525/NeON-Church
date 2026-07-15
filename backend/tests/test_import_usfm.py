"""USFM パーサのテスト（DB 非依存）。

Brenton 七十人訳（英訳）の第二正典がこの形式。難所は枝番の節（"\\v 7a"）で、
そのまま整数にすると節 7 が重複して取り込み時に本文が消えるため、親の節に
つないでいる。そこを中心に確認する。
"""

from bible.importers.usfm import book_name, parse_usfm


def _parse(usfm: str):
    return parse_usfm(usfm, book="Tobit", translation="Brenton (EN)", order=41, source="test")


def test_chapters_and_verses_are_read():
    data, warnings = _parse(
        "\\id TOB\n\\h Tobit\n"
        "\\c 1\n\\p\n\\v 1 The book of the words of Tobit.\n"
        "\\v 2 who in the time of Enemessar.\n"
        "\\c 2\n\\p\n\\v 1 Now when I was come home again.\n"
    )
    chapters = data["chapters"]

    assert [c["number"] for c in chapters] == [1, 2]
    assert [v["number"] for v in chapters[0]["verses"]] == [1, 2]
    assert chapters[0]["verses"][0]["text"] == "The book of the words of Tobit."
    assert data["book"] == "Tobit"
    assert warnings == []


def test_inline_markers_are_removed_but_their_text_is_kept():
    data, _ = _parse(
        "\\c 1\n\\p\n\\v 1 \\sc The\\sc* book of Tobit, the \\add son\\add* of Tobiel.\n"
    )
    text = data["chapters"][0]["verses"][0]["text"]

    assert text == "The book of Tobit, the son of Tobiel."
    assert "\\add" not in text and "\\sc" not in text


def test_paragraph_markers_do_not_leak_into_the_text():
    data, _ = _parse("\\c 1\n\\p\n\\v 1 First part.\n\\p\n\\v 2 Second part.\n")
    verses = data["chapters"][0]["verses"]

    assert verses[0]["text"] == "First part."
    assert "\\p" not in verses[0]["text"]


def test_sub_verses_are_merged_into_their_parent_verse():
    """"\\v 7a" は 7 の続き。整数の節番号に潰すと重複して本文が消えるのを防ぐ。"""
    data, warnings = _parse(
        "\\c 4\n\\p\n"
        "\\v 7 Give alms of thy substance.\n"
        "\\v 7a If thou hast abundance, give alms accordingly.\n"
        "\\v 7b for thou layest up a good treasure.\n"
        "\\v 19 Bless the Lord thy God alway.\n"
    )
    verses = data["chapters"][0]["verses"]

    assert [v["number"] for v in verses] == [7, 19]
    assert verses[0]["text"] == (
        "Give alms of thy substance. If thou hast abundance, give alms accordingly. "
        "for thou layest up a good treasure."
    )
    assert any("枝番" in w and "7a, 7b" in w for w in warnings)


def test_sub_verse_without_a_parent_becomes_the_verse_itself():
    """親の節が無い枝番（シラ書 6 章が "2a" から始まる）は、その番号の節にする。"""
    data, _ = _parse("\\c 6\n\\p\n\\v 2a Extol not thyself.\n\\v 2b lest thy soul be torn.\n")
    verses = data["chapters"][0]["verses"]

    assert [v["number"] for v in verses] == [2]
    assert verses[0]["text"] == "Extol not thyself. lest thy soul be torn."


def test_gaps_in_verse_numbers_are_kept_as_is():
    """写本由来の欠番はそのまま（詰めて振り直すと引用がずれる）。"""
    data, _ = _parse("\\c 1\n\\p\n\\v 1 First.\n\\v 5 Fifth.\n\\v 21 Twenty-first.\n")

    assert [v["number"] for v in data["chapters"][0]["verses"]] == [1, 5, 21]


def test_book_name_is_read_from_the_h_marker():
    assert book_name("\\id TOB\n\\h Tobit \n\\toc1 Tobit\n") == "Tobit"
    assert book_name("\\id TOB\n") is None


def test_missing_chapter_marker_is_reported():
    data, warnings = _parse("\\id TOB\n\\h Tobit\n")

    assert data["chapters"] == []
    assert any("章" in w for w in warnings)
