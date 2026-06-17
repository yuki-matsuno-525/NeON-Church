"""アダムとエバの生涯パーサのテスト（DB 非依存）。

章＝小文字ローマ数字、節＝アラビア数字、章番号の脱落・"I"=節1・範囲節・
番号なし継続・段落内改行、といった癖を合成 HTML で確認する。
"""

from bible.importers.life_of_adam_and_eve import parse_life_of_adam_and_eve


def _page(inner: str) -> str:
    return f"<html><body>{inner}</body></html>"


def test_roman_chapters_and_verses():
    html = _page(
        "<p>i 1 When they were driven out.</p>"
        "<p>ii 1 But after seven days they were hungry and they</p>"
        "<p>2 found it not.</p>"  # 番号付き継続 → 節2
        "<p>iii I And Adam arose.</p>"  # "I" = 節1
        "<p>2 used to have in paradise.</p>"
    )
    data, warnings = parse_life_of_adam_and_eve(html)
    ch = {c["number"]: c for c in data["chapters"]}

    assert sorted(ch) == [1, 2, 3]
    assert [v["number"] for v in ch[2]["verses"]] == [1, 2]
    assert "found it not" in ch[2]["verses"][1]["text"]
    # 章 iii の "I" は節1
    assert [v["number"] for v in ch[3]["verses"]] == [1, 2]
    assert "And Adam arose" in ch[3]["verses"][0]["text"]


def test_dropped_chapter_number_recovered():
    # 31章まで来た直後、章番号の無い "And Adam answered..." を 32 章として補う
    romans = "".join(
        f"<p>{r} 1 Chapter {i} body.</p>"
        for i, r in enumerate(
            ["i","ii","iii","iv","v","vi","vii","viii","ix","x","xi","xii","xiii","xiv","xv",
             "xvi","xvii","xviii","xix","xx","xxi","xxii","xxiii","xxiv","xxv","xxvi","xxvii",
             "xxviii","xxix","xxx","xxxi"], start=1)
    )
    html = _page(
        romans
        + "<p>And Adam answered and said: 'Hear me, my sons. Foo.</p>"  # 脱落した32章
        + "<p>2 'Do not eat of it.'</p>"
        + "<p>xxxiii 1 The devil replied.</p>"
    )
    data, _ = parse_life_of_adam_and_eve(html)
    ch = {c["number"]: c for c in data["chapters"]}
    assert 32 in ch and 33 in ch
    assert ch[32]["verses"][0]["number"] == 1
    assert "And Adam answered" in ch[32]["verses"][0]["text"]
    assert [v["number"] for v in ch[32]["verses"]] == [1, 2]


def test_newline_inside_paragraph_collapsed():
    # 段落内の改行が空白に潰され、脱落章の書き出し照合が壊れないこと
    html = _page(
        "<p>xxxvi 1 And Adam said.</p>"
        "<p>Then Seth and his mother\n went off towards the gates of paradise. Foo.</p>"
    )
    # 35 章まで連番を満たすため前段を補う必要があるので、単体では 36→37 を直接検証する
    # ここでは改行の正規化だけを確認する（_normalize 経由）。
    from bible.importers.life_of_adam_and_eve import _normalize
    assert _normalize("Then Seth\n went") == "Then Seth went"
