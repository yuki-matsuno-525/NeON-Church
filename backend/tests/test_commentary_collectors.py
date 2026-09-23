"""解釈書の収集（commentary/collectors/）のテスト。ネットにはつながず、小さな見本で確かめる。"""

from pathlib import Path

from commentary.collectors import cdb, ccel, japanese, sefaria
from commentary.collectors.common import dedupe_links, link
from commentary.refs import Ref

THML = """<?xml version="1.0"?>
<ThML><ThML.body>
<div1 title="Against Heresies: Book I" id="ix.ii">
  <div2 title="Chapter I" id="ix.ii.ii">
    <p id="ix.ii.ii-p1">They say <scripRef osisRef="Bible:John.1.1" passage="John i. 1">John i. 1</scripRef> means this.<note place="foot" id="n1"><p>Compare <scripRef osisRef="Bible:Gen.1.1" passage="Gen. i. 1"/>.</p></note></p>
    <p id="ix.ii.ii-p2">No reference here.</p>
  </div2>
</div1>
<div1 title="Other" id="ix.iii"><p id="x">Not collected.</p></div1>
</ThML.body></ThML>
"""

CALVIN_STYLE_ID = """<ThML><ThML.body><div1 title="Chapter 1">
<p><scripCom osisRef="Bible:Gen.1.1" type="Commentary" /></p><div class="Commentary" id="Bible:Gen.1.1">
<p><b>1.</b> <i>In the beginning.</i> Comment one.<note place="foot"><p>A footnote.</p></note></p>
<p>More on <scripRef osisRef="Bible:Gen.1.2">Genesis 1:2</scripRef>.</p>
</div>
</div1></ThML.body></ThML>"""

CALVIN_STYLE_MARKER = """<ThML><ThML.body><div1 title="Harmony">
<p><scripCom osisRef="Bible:Matt.5.1 Bible:Luke.6.20" type="Commentary" /></p><div class="Commentary" id="ix.i-p4.2">
<p>Harmony comment.</p>
</div>
</div1></ThML.body></ThML>"""


class TestCcel:
    def test_thml_work_paragraphs_and_citations(self):
        sections = ccel.parse_thml_work(THML, ["ix.ii"], "https://example.org/anf01.html")
        assert [s["text"] for s in sections] == ["They say John i. 1 means this.", "No reference here."]
        # 脚注は本文に入れないが、脚注の中の引用は拾う
        books = [lk["book"] for lk in sections[0]["links"]]
        assert books == ["john", "genesis"]
        assert all(lk["method"] == "citation" for lk in sections[0]["links"])
        assert sections[0]["heading"] == "Against Heresies: Book I › Chapter I"
        assert sections[0]["source_url"].endswith("#ix.ii.ii-p1")

    def test_calvin_commentary_div_with_bible_id(self):
        [s] = ccel.parse_calvin(CALVIN_STYLE_ID, "https://example.org/calcom01.html")
        assert s["heading"] == "Genesis 1:1"
        assert "A footnote" not in s["text"]
        methods = [(lk["book"], lk["verse"], lk["method"]) for lk in s["links"]]
        assert methods == [("genesis", 1, "structure"), ("genesis", 2, "citation")]

    def test_calvin_commentary_after_marker(self):
        [s] = ccel.parse_calvin(CALVIN_STYLE_MARKER, "u")
        assert [(lk["book"], lk["method"]) for lk in s["links"]] == [("matthew", "structure"), ("luke", "structure")]


def _write_toml(path: Path, quote: str, url: str, title: str = "T") -> None:
    path.write_text(
        f"[[commentary]]\nquote='''\n{quote}\n'''\nsource_url='{url}'\nsource_title=\"{title}\"\n",
        encoding="utf-8",
    )


HCF = "https://historicalchristian.faith/by_father.php?file="


class TestCdb:
    def test_classify_hcf_file(self):
        assert cdb.classify_hcf_file("<i>Latin Text from Migne. Translated into English using ChatGPT.</i>") == "machine"
        assert cdb.classify_hcf_file("<i>Latin source: Baehrens. This English translation is released into the public domain.</i>") == "machine"
        assert cdb.classify_hcf_file("<h1>Book 1</h1>[Translated by Dr. Holmes.]") == "human"

    def test_is_allowed(self):
        config = cdb.FATHERS["Origen of Alexandria"]
        classes = {
            "Origen of Alexandria/Commentary on John/Book 1.html": "human",
            "Origen of Alexandria/Homilies on Leviticus/Homily01.html": "machine",
            "Origen of Alexandria/Commentary on John/Book 13.html": "machine",
        }
        a = "Origen of Alexandria"
        assert cdb.is_allowed(a, HCF + "Origen%2520of%2520Alexandria%2FCommentary%2520on%2520John%2FBook%25201.html", config, classes)
        # 機械翻訳は、許可した著作の中でも除く
        assert not cdb.is_allowed(a, HCF + "Origen%2520of%2520Alexandria%2FCommentary%2520on%2520John%2FBook%252013.html", config, classes)
        assert not cdb.is_allowed(a, HCF + "Origen%2520of%2520Alexandria%2FHomilies%2520on%2520Leviticus%2FHomily01.html", config, classes)
        # 出典の無い抜粋・書籍検索からの抜粋は除く
        assert not cdb.is_allowed(a, "", config, classes)
        assert not cdb.is_allowed(a, "https://books.google.com/x", config, classes)
        # New Advent は Schaff 版。全文を別に入れる『ケルソス駁論』だけ除く
        assert cdb.is_allowed(a, "https://www.newadvent.org/fathers/0412.htm", config, classes)
        assert not cdb.is_allowed(a, "https://www.newadvent.org/fathers/04161.htm", config, classes)

    def test_collect_father_and_catena(self, tmp_path):
        origen = tmp_path / "Origen of Alexandria"
        origen.mkdir()
        (origen / "metadata.toml").write_text("default_year=254\n", encoding="utf-8")
        ok = HCF + "Origen%2520of%2520Alexandria%2FDe%2520Principiis%2FBook%25201.html"
        catena = HCF + "Thomas%2520Aquinas%2FCatena%2520Aurea%2FCommentary%2520on%2520John%2FChapter%25201.html"
        _write_toml(origen / "John 1_1.toml", "In the beginning was the Word.", ok, "De Principiis 1")
        _write_toml(origen / "Genesis 1_1.toml", "Heaven and earth.", ok, "De Principiis 2")
        _write_toml(origen / "John 1_2.toml", "From the catena.", catena, "Catena Aurea by Aquinas")
        _write_toml(origen / "John 1_3.toml", "Modern excerpt.", "", "HOMILIES 1")
        classes = {"Origen of Alexandria/De Principiis/Book 1.html": "human"}

        data = cdb.collect_father(tmp_path, "Origen of Alexandria", classes)
        assert data["slug"] == "origen-excerpts"
        assert data["readable"] is False
        # 聖書の順（創世記 → ヨハネ）に並び、カテナと出典不明は入らない
        assert [s["text"] for s in data["sections"]] == ["Heaven and earth.", "In the beginning was the Word."]
        assert data["sections"][1]["links"][0]["method"] == "structure"

        catena_data = cdb.collect_catena(tmp_path)
        assert [(s["heading"], s["text"]) for s in catena_data["sections"]] == [("Origen of Alexandria", "From the catena.")]


class TestSefaria:
    def test_sections_convert_hebrew_numbering(self):
        # ヘブライ語の創世記 32:2 は KJV の 32:1
        chapters = [[] for _ in range(32)]
        chapters[31] = [["on 32:1"], ["AND THE ANGELS OF GOD MET HIM — see (Genesis 28:12)."]]
        sections = sefaria.sections_from_book("Genesis", chapters)
        assert [s["heading"] for s in sections] == ["Genesis 31:55", "Genesis 32:1"]
        links = sections[1]["links"]
        assert (links[0]["chapter"], links[0]["verse"], links[0]["method"]) == (32, 1, "structure")
        assert (links[1]["chapter"], links[1]["verse"], links[1]["method"]) == (28, 12, "citation")

    def test_footnotes_removed(self):
        text = [[['WORD <sup class="footnote-marker">1</sup><i class="footnote">note</i> comment']]]
        [s] = sefaria.sections_from_book("Genesis", text)
        assert s["text"] == "WORD comment"


class TestJapanese:
    def test_index_passage(self):
        assert japanese.parse_index_passage("ローマ1:1-7") == [Ref("romans", 1, 1, 1, 7)]
        assert japanese.parse_index_passage("ローマ2章") == [Ref("romans", 2, None, 2, None)]
        assert japanese.parse_index_passage("ローマ9,10章") == [Ref("romans", 9, None, 10, None)]
        assert japanese.parse_index_passage("Ⅰペテロ1:23-25") == [Ref("1-peter", 1, 23, 1, 25)]
        assert japanese.parse_index_passage("詩篇133篇") == [Ref("psalms", 133, None, 133, None)]
        assert japanese.parse_index_passage("") == []

    def test_chapters_in_heading(self):
        assert japanese._chapters_in("第一章、二章の研究", "job") == [Ref("job", 1, None, 2, None)]
        assert japanese._chapters_in("第三十八章の研究", "job") == [Ref("job", 38, None, 38, None)]
        assert japanese._chapters_in("第十一章、十二章、十四章", "job") == [
            Ref("job", 11, None, 12, None), Ref("job", 14, None, 14, None),
        ]

    def test_citations_ja(self):
        text = "マタイ傳第五章三節を見よ（ヨハネ三の一六）。" + "パウロはこれを受けて、同じ手紙の後半で、信じる者の行く末について次のように述べている。" + "八章二八節"
        links = japanese.citations_ja(text, default_book="romans")
        assert [(lk["book"], lk["chapter"], lk["verse"]) for lk in links] == [
            ("matthew", 5, 3), ("john", 3, 16), ("romans", 8, 28),
        ]

    def test_parse_aozora(self):
        html = """<html><body><div class="main_text">
        <h3><a class="midashi_anchor" id="m1">第一講　<ruby><rb>序</rb><rp>（</rp><rt>じょ</rt><rp>）</rp></ruby>論</a></h3>
        本文一<br />本文二<br />
        <h4><a class="midashi_anchor" id="m2">第一章の研究</a></h4>
        本文三
        </div><div class="bibliographical_information">底本：テスト</div></body></html>"""
        parts, info = japanese.parse_aozora(html)
        assert parts[0][0] == "第一講　序論"
        assert "本文一" in parts[0][1] and "じょ" not in parts[0][1]
        assert parts[1] == ("第一章の研究", "本文三")
        assert "底本：テスト" in info

    def test_parse_ogccl_page(self):
        html = """<html><body><header><h1>第二講 <ruby>初愛<rt>はじめのあい</rt></ruby></h1>
        <h2>第二章（九月二十二日）</h2><h2>藤井武</h2></header>
        <article><p class="paragraph">本文（マラキ四の二）。</p></article></body></html>"""
        title, subtitle, text = japanese.parse_ogccl_page(html)
        assert (title, subtitle, text) == ("第二講 初愛", "第二章（九月二十二日）", "本文（マラキ四の二）。")


def test_dedupe_links_keeps_order():
    a = link(Ref("john", 1, 1), "citation")
    b = link(Ref("john", 1, 2), "citation")
    assert dedupe_links([a, b, dict(a)]) == [a, b]
