"""共通パーサ sectioned.py のテスト（DB 非依存）。

「章＝訳者の見出し／節＝写本の番号」型の難所を合成 HTML で確認する。
書ごとの設定（philip / truth / secret_james / stranger / secret_mark）は
この共通処理に乗っているので、ここでは共通処理の振る舞いを押さえる。
"""

import re

from bible.importers.sectioned import (
    PAGE_NUMBER,
    PARENTHESIZED,
    BookSpec,
    parse_sectioned,
)


def _page(inner: str) -> str:
    return f"<html><body><div>{inner}</div></body></html>"


def _spec(**kw) -> BookSpec:
    base = dict(
        book="Test Book",
        translation="Tester (EN)",
        order=1,
        source="test",
        headings=("First Section", "Second Section", "Third Section"),
    )
    base.update(kw)
    return BookSpec(**base)


def test_sections_become_chapters_and_pages_become_verses():
    html = _page(
        "<p>The following translation is public domain and quite long indeed.</p>"  # 前書きは無視
        "<p>First Section</p>"
        "<p>51 A Hebrew creates a Hebrew.</p>"
        "<p>52 The slave seeks only freedom.</p>"
        "<p>Second Section</p>"
        "<p>53 Those who inherit the dead.</p>"
    )
    data, warnings = parse_sectioned(html, _spec())
    chapters = data["chapters"]

    assert [c["number"] for c in chapters] == [1, 2]
    assert [v["number"] for v in chapters[0]["verses"]] == [51, 52]
    assert [v["number"] for v in chapters[1]["verses"]] == [53]
    assert data["book"] == "Test Book"
    assert all("本文が空" not in w for w in warnings)


def test_chapter_without_page_number_continues_previous_page():
    """ページ番号は見出しをまたいで連続するので、番号の無い章は前章の続き。

    ピリポ 6 章・ヤコブの秘密の書 3 章で実際に起きる（節 1 に落とさない）。
    """
    html = _page(
        "<p>First Section</p>"
        "<p>51 A Hebrew creates a Hebrew.</p>"
        "<p>Second Section</p>"
        "<p>Text that carries on from the previous page with no number.</p>"
        "<p>Third Section</p>"
        "<p>52 Those who inherit the dead.</p>"
    )
    data, _ = parse_sectioned(html, _spec())
    chapters = data["chapters"]

    assert [v["number"] for v in chapters[1]["verses"]] == [51]  # 1 ではなく 51 の続き
    assert [v["number"] for v in chapters[2]["verses"]] == [52]


def test_start_page_seeds_the_first_chapter():
    """写本の開始ページが最初の見出しより前にあるとき（ストレンジャーの書の 59）。"""
    html = _page(
        "<p>First Section</p>"
        "<p>Opening text that sits on the first page but carries no number.</p>"
        "<p>Second Section</p>"
        "<p>60 The next page.</p>"
    )
    data, _ = parse_sectioned(html, _spec(start_page=59))
    chapters = data["chapters"]

    assert [v["number"] for v in chapters[0]["verses"]] == [59]
    assert [v["number"] for v in chapters[1]["verses"]] == [60]


def test_decreasing_number_stays_in_the_body():
    """戻る数字はページ番号ではなく本文（誤検出対策）。"""
    html = _page(
        "<p>First Section</p>"
        "<p>51 A Hebrew creates a Hebrew.</p>"
        "<p>There were 12 disciples in the group.</p>"
    )
    data, _ = parse_sectioned(html, _spec())
    verses = data["chapters"][0]["verses"]

    assert [v["number"] for v in verses] == [51]
    assert "12 disciples" in verses[0]["text"]


def test_leading_unnumbered_text_is_prepended_to_first_verse():
    html = _page(
        "<p>First Section</p>"
        "<p>Words before any page number appears.</p>"
        "<p>51 A Hebrew creates a Hebrew.</p>"
    )
    data, _ = parse_sectioned(html, _spec())
    verses = data["chapters"][0]["verses"]

    assert [v["number"] for v in verses] == [51]
    assert verses[0]["text"].startswith("Words before any page number")


def test_end_heading_stops_the_body():
    html = _page(
        "<p>First Section</p>"
        "<p>51 A Hebrew creates a Hebrew.</p>"
        "<p>Notes on Translation</p>"
        "<p>Second Section</p>"
        "<p>52 This note must not be imported.</p>"
    )
    data, _ = parse_sectioned(html, _spec(end_heading="Notes on Translation"))

    assert [c["number"] for c in data["chapters"]] == [1]


def test_parenthesized_verse_marker():
    html = _page(
        "<p>First Section</p>"
        "<p>(1) But of the Jews no one washed the hands.</p>"
        "<p>(2) And Herod commanded.</p>"
    )
    data, _ = parse_sectioned(html, _spec(verse_marker=PARENTHESIZED))

    assert [v["number"] for v in data["chapters"][0]["verses"]] == [1, 2]


def test_paragraphs_are_counted_when_the_text_has_no_verse_numbers():
    """原文に節番号が無い書（秘密のマルコ）は段落を章ごとに 1 から数える。"""
    html = _page(
        "<p>First Section</p>"
        "<p>From the epistles of the most holy Clement.</p>"
        "<p>Second Section</p>"
        "<p>The first paragraph here.</p>"
        "<p>The second paragraph here.</p>"
    )
    data, _ = parse_sectioned(html, _spec(verse_marker=None))
    chapters = data["chapters"]

    assert [v["number"] for v in chapters[0]["verses"]] == [1]
    assert [v["number"] for v in chapters[1]["verses"]] == [1, 2]


def test_keep_notes_digits_are_not_read_as_page_numbers():
    """"Pages 11 through 14 are missing." の数字で節を切らない（マリア）。"""
    note = re.compile(r"Pages?\s+\d+(?:\s+through\s+\d+)?\s+(?:are|is)\s+missing\.?", re.I)
    html = _page(
        "<p>First Section</p>"
        "<p>7 The soul answered.</p>"
        "<p>Pages 11 through 14 are missing.</p>"
    )
    data, _ = parse_sectioned(html, _spec(keep_notes=(note,), verse_marker=PAGE_NUMBER))
    verses = data["chapters"][0]["verses"]

    assert [v["number"] for v in verses] == [7]
    assert "Pages 11 through 14 are missing." in verses[0]["text"]


def test_missing_section_heading_is_warned():
    html = _page("<p>First Section</p><p>51 Only one section is present.</p>")
    _, warnings = parse_sectioned(html, _spec())

    assert any("Second Section" in w for w in warnings)


# --- heading_pattern 型（見出し自身が章番号を持つ書）---


def _numbered_spec(**kw) -> BookSpec:
    base = dict(
        book="Test Book",
        translation="Tester (EN)",
        order=1,
        source="test",
        heading_pattern=re.compile(r"^Chapter\s+(?P<number>\d+)\s*:\s*(?P<title>.*)$"),
        verse_marker=PARENTHESIZED,
        verses_restart_each_chapter=True,
    )
    base.update(kw)
    return BookSpec(**base)


def test_chapter_number_comes_from_the_heading():
    html = _page(
        "<p>Preface that should be ignored because it is long enough.</p>"
        "<p>Chapter 1: Joachim's Plight</p>"
        "<p>(1) Joachim was a very rich man.</p>"
        "<p>Chapter 2: Anna's Plight</p>"
        "<p>(1) Anna mourned.</p>"
    )
    data, _ = parse_sectioned(html, _numbered_spec())
    chapters = data["chapters"]

    assert [c["number"] for c in chapters] == [1, 2]
    # 節番号は章ごとに 1 へ戻る
    assert [v["number"] for v in chapters[1]["verses"]] == [1]


def test_special_heading_gets_its_own_chapter_number():
    """トマスの福音書の Prologue は第0章（章番号と語番号を一致させる）。"""
    spec = _numbered_spec(
        heading_pattern=re.compile(r"^Saying\s+(?P<number>\d+)\s*:\s*(?P<title>.*)$"),
        special_headings={"Prologue": 0},
        verse_marker=None,
    )
    html = _page(
        "<p>Prologue</p>"
        "<p>These are the hidden sayings.</p>"
        "<p>Saying 1: True Meaning</p>"
        "<p>Whoever discovers the meaning won't taste death.</p>"
    )
    data, _ = parse_sectioned(html, spec)

    assert [c["number"] for c in data["chapters"]] == [0, 1]
    assert data["chapters"][0]["verses"][0]["text"].startswith("These are the hidden")


def test_duplicate_chapter_heading_is_skipped():
    """異版・付録の2度目の "Chapter 18:" を本文に混ぜない（ヤコブによる幼児福音書）。"""
    html = _page(
        "<p>Chapter 1: First</p>"
        "<p>(1) The real body text.</p>"
        "<p>Chapter 1: A Shorter Version</p>"
        "<p>(1) The appendix variant must not be imported.</p>"
    )
    data, warnings = parse_sectioned(html, _numbered_spec())
    chapters = data["chapters"]

    assert [c["number"] for c in chapters] == [1]
    assert "appendix variant" not in chapters[0]["verses"][0]["text"]
    assert any("重複" in w for w in warnings)


def test_chapters_are_sorted_by_number():
    html = _page(
        "<p>Chapter 2: Second</p><p>(1) Second chapter.</p>"
        "<p>Chapter 1: First</p><p>(1) First chapter.</p>"
    )
    data, _ = parse_sectioned(html, _numbered_spec())

    assert [c["number"] for c in data["chapters"]] == [1, 2]
