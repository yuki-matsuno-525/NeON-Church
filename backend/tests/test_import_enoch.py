"""エノク書パーサ／バリデーションのテスト（DB 非依存）。

実際の pg77935 HTML の難所を小さな合成 HTML で再現し、
正規化スキーマが期待どおり生成されることを確認する。
"""

from bible.importers.enoch import parse_enoch, roman_to_int
from bible.importers.validate import summarize, validate


def _body(inner: str) -> str:
    """本文開始マーカーを含む最小の HTML を組み立てる。"""
    return (
        "<html><body>"
        '<h2 class="c007">THE BOOK OF ENOCH I-XXXVI.</h2>'
        f"{inner}"
        '<div class="footnote"><p>footnote junk 99. ignore</p></div>'
        "</body></html>"
    )


def test_roman_to_int():
    assert roman_to_int("I.") == 1
    assert roman_to_int("IV.") == 4
    assert roman_to_int("XLVI.") == 46
    assert roman_to_int("CVIII.") == 108
    assert roman_to_int("ABC") is None


def test_chapter_patterns_and_cleaning():
    html = _body(
        # 1) 散文段落先頭の <abbr>。ページ番号 span と脚注 sup を除去できること
        '<p class="c004"><abbr title="one">I.</abbr> 1. First '
        '<span class="pageno">32</span>verse. 2. Second verse<sup>[1]</sup> here.</p>'
        # 2) 番号なしの章は全体が 1 節
        '<p class="c005"><abbr title="two">II.</abbr> Single unnumbered verse.</p>'
        # 3) 章番号は見出し <h4> のみ。本文の詩文は "1." 始まり
        '<h4 class="c017"><abbr title="three">III.</abbr> Title only</h4>'
        '<div class="lg-container-b"><div class="linegroup"><div class="group">'
        '<div class="line">1. Poem line one</div>'
        '<div class="line">2. Poem line two</div>'
        "</div></div></div>"
    )
    data, _ = parse_enoch(html)
    chapters = {c["number"]: c for c in data["chapters"]}

    assert sorted(chapters) == [1, 2, 3]

    v1 = {v["number"]: v["text"] for v in chapters[1]["verses"]}
    assert v1[1] == "First verse."       # ページ番号 32 が消えている
    assert v1[2] == "Second verse here."  # 脚注 [1] が消えている

    assert [v["number"] for v in chapters[2]["verses"]] == [1]
    assert chapters[2]["verses"][0]["text"] == "Single unnumbered verse."

    assert [v["number"] for v in chapters[3]["verses"]] == [1, 2]


def test_subverse_and_displaced_verses():
    # 詩文行内に章 <abbr>、副節 "5 a."（スペースあり）が節 2〜4 より前に転置されているケース
    html = _body(
        '<div class="lg-container-b"><div class="group">'
        '<div class="line"><abbr title="four">IV.</abbr> 1. Verse one</div>'
        '<div class="line">5 <i>a.</i> Displaced verse five part a</div>'
        '<div class="line">2. Verse two</div>'
        '<div class="line">3. Verse three</div>'
        '<div class="line">5 <i>b.</i> Verse five part b</div>'
        "</div></div>"
    )
    data, _ = parse_enoch(html)
    ch = data["chapters"][0]
    assert ch["number"] == 4
    nums = [v["number"] for v in ch["verses"]]
    # 転置された 5 を拾い、番号順に整列。副節 5a/5b は節 5 に結合される。
    assert nums == [1, 2, 3, 5]
    v5 = next(v for v in ch["verses"] if v["number"] == 5)
    assert "part a" in v5["text"] and "part b" in v5["text"]


def test_calendar_number_not_treated_as_verse():
    # 暦の大きな数字（80.）は節番号に化けず本文に残ること
    html = _body(
        '<p class="c004"><abbr title="five">V.</abbr> 1. The moon waxes 80. days were counted.</p>'
    )
    data, _ = parse_enoch(html)
    ch = data["chapters"][0]
    assert [v["number"] for v in ch["verses"]] == [1]
    assert "80. days" in ch["verses"][0]["text"]


def test_validate_detects_gap_and_empty_and_brackets():
    data = {
        "book": "X", "translation": "Y", "order": 1, "source": "z",
        "chapters": [
            {"number": 1, "verses": [
                {"number": 1, "text": "ok ⌜fix⌝"},
                {"number": 3, "text": "gap here"},   # 欠番 2
            ]},
            {"number": 2, "verses": [
                {"number": 1, "text": "unbalanced ⌜oops"},  # 閉じ記号なし
            ]},
        ],
    }
    issues = validate(data, expect_chapters=2)
    msgs = "\n".join(m for _, m in issues)
    assert "欠番 [2]" in msgs
    assert "⌜⌝" in msgs  # 校訂記号の不一致
    counts = summarize(issues)
    assert counts["warn"] >= 2
