"""Q資料パーサのテスト（DB 非依存）。

Q は写本が無く、章節はルカの番号をそのまま使う。参照記号が3種類あり
（本文開始 "(QLk 3:2)" / 章が変わる "(22:28)" / 節だけ "(20)"）、章が
飛び飛びになるのが難所なので、そこを合成 HTML で確認する。
"""

from bible.importers.quelle import parse_quelle


def _page(inner: str) -> str:
    return f"<html><body><div>{inner}</div></body></html>"


def test_luke_chapter_and_verse_numbers_are_used():
    html = _page(
        "<p>Preface about the Critical Edition of Q which must be ignored entirely.</p>"
        "<p>(QLk 3:2) John [ . . . ] (3) the entire region around the Jordan</p>"
        "<p>(7) He told the crowds who went out to be baptized.</p>"
    )
    data, _ = parse_quelle(html)
    chapters = data["chapters"]

    assert [c["number"] for c in chapters] == [3]
    assert [v["number"] for v in chapters[0]["verses"]] == [2, 3, 7]
    assert chapters[0]["verses"][0]["text"] == "John [ . . . ]"


def test_preface_before_the_first_reference_is_dropped():
    html = _page(
        "<p>Symbols [ ] Gap in the text ( ) Editorial insertion</p>"
        "<p>(QLk 3:2) John [ . . . ]</p>"
    )
    data, _ = parse_quelle(html)

    text = " ".join(v["text"] for c in data["chapters"] for v in c["verses"])
    assert "Symbols" not in text
    assert "Editorial insertion" not in text


def test_explicit_chapter_reference_starts_a_new_chapter():
    html = _page(
        "<p>(QLk 3:2) John [ . . . ]</p>"
        "<p>(22:28) You who've followed me (30) will sit on thrones.</p>"
    )
    data, _ = parse_quelle(html)
    chapters = data["chapters"]

    assert [c["number"] for c in chapters] == [3, 22]
    assert [v["number"] for v in chapters[1]["verses"]] == [28, 30]


def test_chapters_are_sparse_because_q_does_not_cover_all_of_luke():
    html = _page(
        "<p>(QLk 3:2) John [ . . . ]</p>"
        "<p>(6:20) Blessed are you who are poor.</p>"
        "<p>(22:28) You who've followed me.</p>"
    )
    data, warnings = parse_quelle(html)

    assert [c["number"] for c in data["chapters"]] == [3, 6, 22]
    # 1 始まりでも連番でもないのは正しい状態なので、その旨を出す
    assert any("ルカの章番号" in w for w in warnings)


def test_editorial_insertions_are_not_read_as_verse_numbers():
    html = _page("<p>(QLk 3:2) John (the baptizer) [ . . . ] (3) the region</p>")
    data, _ = parse_quelle(html)
    verses = data["chapters"][0]["verses"]

    assert [v["number"] for v in verses] == [2, 3]
    assert "(the baptizer)" in verses[0]["text"]


def test_missing_body_start_is_reported():
    data, warnings = parse_quelle(_page("<p>Only a preface here.</p>"))

    assert data["chapters"] == []
    assert any("本文の開始" in w for w in warnings)
