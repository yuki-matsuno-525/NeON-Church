"""トマスによる幼児福音書パーサのテスト（DB 非依存）。

章＝"Chapter N: タイトル"、節＝段落先頭の "(n)"、末尾 "Notes" 以降は本文外、
章冒頭の番号なし注記は最初の節に前置き、という難所を合成 HTML で確認する。
"""

from bible.importers.infancy_thomas import parse_infancy_thomas


def _page(inner: str) -> str:
    return f"<html><body><div>{inner}</div></body></html>"


def test_chapters_titles_and_verses():
    html = _page(
        "<p>Symbols ( ) Editorial insertion</p>"  # 前書きは無視
        "<p>Chapter 1: Prologue</p>"
        "<p>I, Thomas, wrote this. This is the beginning:</p>"  # 節番号なし→1節
        "<p>Chapter 2: Jesus Makes Sparrows</p>"
        "<p>(1) The child Jesus was five.</p>"
        "<p>(2) He formed twelve sparrows.</p>"
        "<p>But Jesus clapped his hands.</p>"  # 番号なし継続→(2)に連結
        "<p>Notes</p>"  # 以降は注釈なので本文外
        "<p>Chapter 1: The prologue is probably not original.</p>"
    )
    data, warnings = parse_infancy_thomas(html)
    chapters = {c["number"]: c for c in data["chapters"]}

    # Notes 以降の "Chapter 1:" を拾わず、本文は 1・2 章のみ
    assert sorted(chapters) == [1, 2]

    # 第1章: 節番号なし → 1節にまとまる
    assert [v["number"] for v in chapters[1]["verses"]] == [1]
    assert "This is the beginning" in chapters[1]["verses"][0]["text"]

    # 第2章: (1)(2) で分割、番号なし継続は (2) に連結
    v2 = {v["number"]: v["text"] for v in chapters[2]["verses"]}
    assert sorted(v2) == [1, 2]
    assert "child Jesus was five" in v2[1]
    assert "twelve sparrows" in v2[2] and "clapped his hands" in v2[2]

    # 章タイトルが警告（books.ts 用）に出る
    assert any("Prologue" in w and "Jesus Makes Sparrows" in w for w in warnings)


def test_leading_note_prepended_to_first_verse():
    html = _page(
        "<p>Chapter 10: Jesus Heals a Woodcutter</p>"
        "<p>In Hagios Saba 259, this passage appears after Chapter 16.</p>"
        "<p>(1) A young man was splitting wood.</p>"
        "<p>(2) Jesus healed his foot.</p>"
    )
    data, _ = parse_infancy_thomas(html)
    verses = {v["number"]: v["text"] for v in data["chapters"][0]["verses"]}
    assert sorted(verses) == [1, 2]
    # 章冒頭の注記は捨てず、最初の節に前置きされる
    assert "Hagios Saba 259" in verses[1]
    assert "splitting wood" in verses[1]
    # 写本番号 259 や "Chapter 16" の 16 は (n) でないので節番号にならない
    assert "259" not in verses[2]
