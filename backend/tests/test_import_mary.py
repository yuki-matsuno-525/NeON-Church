"""マリアの福音書パーサのテスト（DB 非依存）。

この書の難所（章＝セクション見出し、節＝ページ番号、章冒頭の番号なしテキスト、
段落途中のページ番号、欠落注記の数字）を小さな合成 HTML で再現して確認する。
"""

from bible.importers.mary import parse_mary


def _page(inner: str) -> str:
    """本文段落を含む最小の HTML（本文コンテナを1つだけ持つ）を組み立てる。"""
    return f"<html><body><div>{inner}</div></body></html>"


def test_sections_become_chapters_pages_become_verses():
    html = _page(
        "<p>Symbols 7 Page Number</p>"  # 前書き（最初の見出しより前）は無視
        "<p>An Eternal Perspective</p>"
        '<p>7 First page text.</p>'
        "<p>Second paragraph still page 7.</p>"
        "<p>The Gospel</p>"
        "<p>Chapter start without a number, then 9 page nine here.</p>"
        "<p>The Gospel According to Mary</p>"  # コロフォン以降は本文外
        "<p>Notes on Translation</p>"
        "<p>Page 8 : some note.</p>"
    )
    data, warnings = parse_mary(html)
    chapters = data["chapters"]

    # 章はセクション見出しの登場順。コロフォン以降は含めない。
    assert [c["number"] for c in chapters] == [1, 2]

    # 第1章: ページ 7 の1節（同じページの段落は結合）
    assert [v["number"] for v in chapters[0]["verses"]] == [7]
    assert "First page text." in chapters[0]["verses"][0]["text"]
    assert "still page 7" in chapters[0]["verses"][0]["text"]

    # 第2章: 章冒頭の番号なしテキストは最初の節(9)に前置きされ、捨てられない
    v9 = chapters[1]["verses"][0]
    assert v9["number"] == 9
    assert "Chapter start without a number" in v9["text"]
    assert "page nine here" in v9["text"]
    assert "9" not in v9["text"].split("page nine")[0][-3:]  # ページ番号は除去
    # 本文の節分割では警告は出ない（合成 HTML に無いセクションの注意のみ）
    assert all("本文が空" not in w for w in warnings)


def test_missing_pages_note_kept_but_not_split():
    html = _page(
        "<p>Mary and Jesus</p>"
        "<p>10 page ten content.</p>"
        "<p>Pages 11 through 14 are missing.</p>"
    )
    data, _ = parse_mary(html)
    verses = data["chapters"][0]["verses"]

    # 欠落注記の 11・14 は節境界にならず、注記は本文に残る
    assert [v["number"] for v in verses] == [10]
    assert "Pages 11 through 14 are missing." in verses[0]["text"]


def test_section_without_pages_is_single_verse():
    html = _page(
        "<p>Conflict over Authority</p>"
        "<p>No page numbers at all in this section.</p>"
    )
    data, warnings = parse_mary(html)
    verses = data["chapters"][0]["verses"]
    assert [v["number"] for v in verses] == [1]
    assert "No page numbers" in verses[0]["text"]
    # 他のセクション見出しが無いので警告が出る
    assert any("見つからなかった" in w for w in warnings)
