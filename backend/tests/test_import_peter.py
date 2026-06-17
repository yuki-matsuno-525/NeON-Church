"""ペテロの福音書パーサのテスト（DB 非依存）。

章＝セクション見出し、節＝丸括弧数字で見出しをまたいで連続、見出し冒頭の番号なし
テキストは最初の節に前置き、という難所を合成 HTML で確認する。
"""

from bible.importers.peter import parse_peter


def _page(inner: str) -> str:
    return f"<html><body><div>{inner}</div></body></html>"


def test_sections_become_chapters_with_continuous_verses():
    html = _page(
        "<p>The following translation is public domain and quite long indeed.</p>"  # 前書きは無視
        "<p>Pilate and Herod</p>"
        "<p>(1) But of the Jews no one washed the hands.</p>"
        "<p>(2) And Herod commanded.</p>"
        "<p>Joseph Requests Jesus' Body</p>"
        "<p>(3) And Joseph stood there.</p>"
        "<p>(5) And Herod said, \"Brother Pilate.\"</p>"
    )
    data, warnings = parse_peter(html)
    chapters = data["chapters"]

    # 章はセクション見出しの登場順
    assert [c["number"] for c in chapters] == [1, 2]
    assert [v["number"] for v in chapters[0]["verses"]] == [1, 2]

    # 節番号は見出しをまたいで連続（章2は3から、5は本文に残る）
    nums2 = [v["number"] for v in chapters[1]["verses"]]
    assert nums2 == [3, 5]
    # 本文の節分割では警告は出ない（合成 HTML に無い見出しの注意のみ）
    assert all("本文が空" not in w for w in warnings)


def test_leading_unnumbered_text_prepended():
    html = _page(
        "<p>The Lord is Tortured and Mocked</p>"
        "<p>And he handed him over to the people.</p>"  # 番号なしの章冒頭
        "<p>(7) And they were clothing him with purple.</p>"
        "<p>(9) And other bystanders were spitting.</p>"
    )
    data, _ = parse_peter(html)
    verses = {v["number"]: v["text"] for v in data["chapters"][0]["verses"]}
    assert sorted(verses) == [7, 9]
    # 章冒頭の番号なしテキストは捨てず、最初の節(7)に前置きされる
    assert "handed him over" in verses[7]
    assert "clothing him with purple" in verses[7]


def test_curly_apostrophe_heading_matches():
    # 見出しの引用符が丸 (’) でも半角 (') の SECTION_HEADINGS と一致する
    html = _page(
        "<p>Joseph Requests Jesus’ Body</p>"
        "<p>(3) And Joseph stood there.</p>"
    )
    data, _ = parse_peter(html)
    assert data["chapters"][0]["number"] == 1
    assert data["chapters"][0]["verses"][0]["number"] == 3
