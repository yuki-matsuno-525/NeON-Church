"""解釈書の聖書箇所の読み取り（commentary/refs.py・versification.py）のテスト。"""

from commentary.refs import (
    Ref,
    find_bare_refs,
    find_japanese_refs,
    find_parenthetical_refs,
    parse_cdb_filename,
    parse_number,
    parse_osis,
)
from commentary.versification import hebrew_to_kjv


class TestParseNumber:
    def test_arabic_and_fullwidth(self):
        assert parse_number("21") == 21
        assert parse_number("２１") == 21

    def test_kanji_with_units(self):
        assert parse_number("十") == 10
        assert parse_number("二十一") == 21
        assert parse_number("百三十三") == 133
        assert parse_number("百五十") == 150

    def test_kanji_positional(self):
        # 明治〜昭和の本は「二一節」「三〇節」と位取りで書く
        assert parse_number("二一") == 21
        assert parse_number("三〇") == 30
        assert parse_number("一三三") == 133


class TestParseOsis:
    def test_single_verse(self):
        assert parse_osis("Bible:Gen.1.1") == [Ref("genesis", 1, 1, 1, 1)]

    def test_range_in_one_chapter(self):
        assert parse_osis("Bible:1Pet.5.1-1Pet.5.5") == [Ref("1-peter", 5, 1, 5, 5)]

    def test_range_across_chapters(self):
        assert parse_osis("Bible:Matt.5.1-Matt.7.29") == [Ref("matthew", 5, 1, 7, 29)]

    def test_whole_chapter(self):
        assert parse_osis("Bible:Gen.1") == [Ref("genesis", 1, None, 1, None)]

    def test_several_refs(self):
        refs = parse_osis("Bible:Matt.3.1 Bible:Mark.1.2")
        assert [r.book for r in refs] == ["matthew", "mark"]

    def test_unknown_book_is_dropped(self):
        assert parse_osis("Bible:Foo.1.1 Bible:John.3.16") == [Ref("john", 3, 16, 3, 16)]


class TestParseCdbFilename:
    def test_single(self):
        assert parse_cdb_filename("Matthew 23_35") == Ref("matthew", 23, 35, 23, 35)

    def test_range(self):
        assert parse_cdb_filename("Matthew 23_35-41") == Ref("matthew", 23, 35, 23, 41)

    def test_cross_chapter(self):
        assert parse_cdb_filename("1 Kings 19_10-20_3") == Ref("1-kings", 19, 10, 20, 3)

    def test_numbered_book_and_song(self):
        assert parse_cdb_filename("1 Corinthians 13_4").book == "1-corinthians"
        assert parse_cdb_filename("Song of Solomon 1_1").book == "song-of-songs"

    def test_unknown_book(self):
        assert parse_cdb_filename("Prayer of Azariah 1_1") is None
        assert parse_cdb_filename("metadata") is None


class TestJapaneseRefs:
    def refs(self, text):
        return [r for r, _, _ in find_japanese_refs(text)]

    def test_old_style_gospel(self):
        assert self.refs("マタイ傳第十六章二一節に言う") == [Ref("matthew", 16, 21, 16, 21)]

    def test_verse_range(self):
        assert self.refs("ロマ書八章二八節より三〇節まで") == [Ref("romans", 8, 28, 8, 30)]

    def test_psalm_chapter_only(self):
        assert self.refs("詩篇百三十三篇") == [Ref("psalms", 133)]

    def test_modern_names_and_colon(self):
        assert self.refs("ローマ人への手紙8:28-30") == [Ref("romans", 8, 28, 8, 30)]

    def test_book_name_alone_is_not_a_ref(self):
        assert self.refs("ロマ書の研究を始める") == []

    def test_longest_name_wins(self):
        # 「ヨハネ傳」ではなく「ヨハネ傳福音書」として読む（どちらでも john だが位置がずれない）
        found = find_japanese_refs("ヨハネ傳福音書三章十六節")
        assert found[0][0] == Ref("john", 3, 16, 3, 16)
        assert found[0][1] == 0


class TestParentheticalRefs:
    def test_short_names_in_parentheses(self):
        refs = [r for r, _, _ in find_parenthetical_refs("という（マラキ四の二）。（黙示録二二の一六）")]
        assert refs == [Ref("malachi", 4, 2, 4, 2), Ref("revelation", 22, 16, 22, 16)]

    def test_list_inside_parentheses(self):
        refs = [r for r, _, _ in find_parenthetical_refs("（ヨハネ三の一六、ロマ八の二八―三〇）")]
        assert refs == [Ref("john", 3, 16, 3, 16), Ref("romans", 8, 28, 8, 30)]

    def test_outside_parentheses_is_ignored(self):
        assert find_parenthetical_refs("ヨハネ三の一六") == []


class TestBareRefs:
    def test_uses_default_book(self):
        refs = [r for r, _, _ in find_bare_refs("これは一章十七節の意である", "romans", [])]
        assert refs == [Ref("romans", 1, 17, 1, 17)]

    def test_skips_right_after_named_ref(self):
        text = "マタイ傳五章三節、また六章九節"
        named = find_japanese_refs(text)
        taken = [(s, e) for _, s, e in named]
        assert find_bare_refs(text, "romans", taken) == []


class TestHebrewToKjv:
    def test_genesis_32(self):
        assert hebrew_to_kjv("genesis", 32, 1) == (31, 55)
        assert hebrew_to_kjv("genesis", 32, 2) == (32, 1)
        assert hebrew_to_kjv("genesis", 32, 33) == (32, 32)

    def test_exodus_8(self):
        assert hebrew_to_kjv("exodus", 7, 26) == (8, 1)
        assert hebrew_to_kjv("exodus", 8, 1) == (8, 5)

    def test_deuteronomy_29(self):
        assert hebrew_to_kjv("deuteronomy", 28, 69) == (29, 1)
        assert hebrew_to_kjv("deuteronomy", 29, 28) == (29, 29)

    def test_same_numbering_passes_through(self):
        assert hebrew_to_kjv("genesis", 1, 1) == (1, 1)
        assert hebrew_to_kjv("isaiah", 9, 1) == (9, 1)
