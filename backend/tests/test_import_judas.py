"""ユダの福音書パーサのテスト（DB 非依存）。

章＝セクション見出し、節＝ページ番号で見出しをまたいで連続、見出し冒頭の番号なし
テキストは最初の節に前置き、末尾コロフォン以降は本文外、を合成 HTML で確認する。
"""

from bible.importers.judas import parse_judas


def _page(inner: str) -> str:
    return f"<html><body><div>{inner}</div></body></html>"


def test_sections_pages_and_colophon_cutoff():
    html = _page(
        "<p>The following translation is public domain and rather long indeed here.</p>"  # 前書き
        "<p>Introduction</p>"
        "<p>33 This is the secret message.</p>"
        "<p>Jesus Criticizes the Disciples</p>"
        "<p>One day he was with his disciples. 34 He found them sitting.</p>"
        "<p>The Gospel of Judas</p>"  # コロフォン以降は本文外
        "<p>Notes on Translation</p>"
        "<p>Page 33 : note.</p>"
    )
    data, warnings = parse_judas(html)
    chapters = data["chapters"]

    # 章はセクション見出しの登場順。コロフォン以降は含めない。
    assert [c["number"] for c in chapters] == [1, 2]
    assert [v["number"] for v in chapters[0]["verses"]] == [33]

    # 第2章: 章冒頭の番号なしテキストは最初の節(34)に前置きされる
    v34 = chapters[1]["verses"][0]
    assert v34["number"] == 34
    assert "One day he was with his disciples" in v34["text"]
    assert "found them sitting" in v34["text"]
    assert all("本文が空" not in w for w in warnings)


def test_curly_apostrophe_heading_matches():
    # 見出しの引用符が丸 (’) でも半角 (') の SECTION_HEADINGS と一致する
    html = _page(
        "<p>The Disciples’ Vision</p>"
        "<p>38 Another day Jesus came up to them.</p>"
    )
    data, _ = parse_judas(html)
    assert data["chapters"][0]["number"] == 1
    assert data["chapters"][0]["verses"][0]["number"] == 38
