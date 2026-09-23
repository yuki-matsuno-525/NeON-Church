"""解釈書の API（commentary/views.py）のテスト。"""

import pytest
from rest_framework.test import APIClient

from commentary.loader import load_work


def link(book, chapter, verse=None, chapter_end=None, verse_end=None, method="structure", confidence=None):
    return {
        "book": book, "chapter": chapter, "verse": verse,
        "chapter_end": chapter if chapter_end is None else chapter_end,
        "verse_end": verse if verse_end is None else verse_end,
        "method": method, "confidence": confidence,
    }


WHOLE_ROMANS = {"book": "romans", "chapter": None, "verse": None, "chapter_end": None, "verse_end": None,
                "method": "structure", "confidence": None}


def work(slug, year, chapters, tradition="patristic"):
    return {
        "slug": slug, "title": slug.title(), "title_ja": f"{slug}の本", "author": "A", "author_ja": "著者",
        "year": year, "tradition": tradition, "language": "en", "translator": "", "source_name": "S",
        "source_url": "https://example.org/", "license": "public-domain", "license_note": "note",
        "readable": True, "chapters": chapters,
    }


def section(text, *links, heading=""):
    return {"heading": heading, "text": text, "links": list(links)}


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def works(db):
    load_work(work("calvin-romans", 1555, [
        {"number": 8, "title": "ローマ人への手紙 8章", "links": [], "sections": [
            section("C" * 400, link("romans", 8, 28), heading="Romans 8:28"),
            section("range", link("romans", 8, 29, 8, 30), heading="Romans 8:29-30"),
        ]},
    ], tradition="reformation"))
    load_work(work("augustine", 420, [
        {"number": 1, "title": "Book I", "links": [], "sections": [
            # 同じ区切りに2通りの結び付き → 論じるほうで1件にまとまる
            section("cites Rom 8:28", link("romans", 8, 28, method="citation"), link("romans", 8, 28)),
            section("whole chapter", link("romans", 8, None, 8, None, method="citation")),
            section("across chapters", link("romans", 7, 20, 8, 2, method="citation")),
        ]},
    ]))
    load_work(work("uchimura", 1924, [
        {"number": 1, "title": "第1講　ロマ書の大意", "links": [WHOLE_ROMANS], "sections": [section("大意の本文")]},
        {"number": 41, "title": "第41講　救いの完成", "title_en": "Lecture 41", "links": [link("romans", 8, 28, 8, 30)],
         "sections": [section("第四十一講の本文"), section("推定", link("romans", 8, 28, method="ai", confidence=0.9))]},
    ], tradition="mukyokai"))


def passage(client, **params):
    res = client.get("/api/commentary/passage/", params)
    assert res.status_code == 200
    return res.json()


def rows(client, **params):
    return [(r["work"]["slug"], r["chapter_number"], r["number"], r["method"]) for r in passage(client, **params)["results"]]


@pytest.mark.django_db
class TestPassage:
    def test_discuss_includes_sections_and_whole_lectures_by_year(self, client, works):
        assert rows(client, book="romans", chapter=8, verse=28) == [
            ("augustine", 1, 1, "structure"),
            ("calvin-romans", 8, 1, "structure"),
            ("uchimura", 41, None, "structure"),  # 講そのものが 8:28–30 を論じる
        ]

    def test_chapter_entry_uses_title_and_first_paragraph(self, client, works):
        entry = next(r for r in passage(client, book="romans", chapter=8, verse=28)["results"] if r["number"] is None)
        assert entry["heading"] == "第41講　救いの完成"
        assert (entry["chapter_title"], entry["chapter_title_en"]) == ("第41講　救いの完成", "Lecture 41")
        assert entry["excerpt"] == "第四十一講の本文"

    def test_broad_is_whole_chapter_or_book(self, client, works):
        assert rows(client, book="romans", chapter=8, verse=28, kind="broad") == [("uchimura", 1, None, "structure")]

    def test_mention_excludes_discussed(self, client, works):
        assert rows(client, book="romans", chapter=8, verse=28, kind="mention") == [
            ("augustine", 1, 2, "citation"),
            ("uchimura", 41, 2, "ai"),
        ]

    def test_ai_keeps_confidence(self, client, works):
        by_number = {(r["chapter_number"], r["number"]): r for r in
                     passage(client, book="romans", chapter=8, verse=28, kind="mention")["results"]}
        assert by_number[(41, 2)]["confidence"] == 0.9
        assert by_number[(1, 2)]["confidence"] is None

    def test_ranges(self, client, works):
        assert ("augustine", 1, 3, "citation") in rows(client, book="romans", chapter=8, verse=2, kind="mention")
        assert all(r[2] != 3 for r in rows(client, book="romans", chapter=8, verse=3, kind="mention"))
        assert ("calvin-romans", 8, 2, "structure") in rows(client, book="romans", chapter=8, verse=30)

    def test_section_entry_fields(self, client, works):
        calvin = next(r for r in passage(client, book="romans", chapter=8, verse=28)["results"]
                      if r["work"]["slug"] == "calvin-romans")
        assert calvin["chapter_title"] == "ローマ人への手紙 8章"
        assert calvin["heading"] == "Romans 8:28"
        assert len(calvin["excerpt"]) == 280
        assert calvin["truncated"] is True

    def test_tradition_filter(self, client, works):
        assert rows(client, book="romans", chapter=8, verse=28, tradition="mukyokai") == [("uchimura", 41, None, "structure")]

    def test_bad_params_return_empty(self, client, works):
        assert passage(client, book="romans")["results"] == []
        assert passage(client, chapter=8)["results"] == []
        assert passage(client, book="romans", chapter=8, verse=28, kind="nope")["results"] == []
        assert passage(client, book="john", chapter=8, verse=28)["results"] == []


@pytest.mark.django_db
class TestReading:
    def test_list(self, client, works):
        data = client.get("/api/commentary/works/").json()
        assert [(w["slug"], w["chapter_count"], w["section_count"]) for w in data] == [
            ("augustine", 1, 3), ("calvin-romans", 1, 2), ("uchimura", 2, 3),
        ]

    def test_same_author_follows_bible_order(self, client, works):
        # 同じ年・同じ著者の本は、slug の字順ではなく order（聖書の書の順）で並ぶ
        load_work({**work("rashi-numbers", 1100, [{"number": 1, "title": "t", "links": [], "sections": [section("n")]}]), "order": 4})
        load_work({**work("rashi-exodus", 1100, [{"number": 1, "title": "t", "links": [], "sections": [section("e")]}]), "order": 2})
        data = client.get("/api/commentary/works/").json()
        assert [w["slug"] for w in data if w["slug"].startswith("rashi")] == ["rashi-exodus", "rashi-numbers"]

    def test_work_detail_has_chapters(self, client, works):
        data = client.get("/api/commentary/works/uchimura/").json()
        assert data["license"] == "public-domain"
        assert data["chapters"] == [
            {"number": 1, "title": "第1講　ロマ書の大意", "title_en": "", "section_count": 1},
            {"number": 41, "title": "第41講　救いの完成", "title_en": "Lecture 41", "section_count": 2},
        ]
        assert client.get("/api/commentary/works/nope/").status_code == 404

    def test_chapter_detail(self, client, works):
        data = client.get("/api/commentary/works/uchimura/chapters/41/").json()
        assert (data["title"], data["title_en"], data["prev_number"], data["next_number"], data["section_count"]) == (
            "第41講　救いの完成", "Lecture 41", 1, None, 2,
        )
        assert data["work"]["slug"] == "uchimura"
        assert data["links"][0]["book"] == "romans"
        assert client.get("/api/commentary/works/uchimura/chapters/2/").status_code == 404

    def test_chapter_sections(self, client, works):
        data = client.get("/api/commentary/works/augustine/chapters/1/sections/").json()
        assert [s["number"] for s in data["results"]] == [1, 2, 3]
        assert data["results"][2]["links"][0] == {
            "book": "romans", "chapter": 7, "verse": 20, "chapter_end": 8, "verse_end": 2,
            "method": "citation", "confidence": None,
        }
        paged = client.get("/api/commentary/works/augustine/chapters/1/sections/", {"page_size": 2, "page": 2}).json()
        assert [s["number"] for s in paged["results"]] == [3]
        assert client.get("/api/commentary/works/augustine/chapters/9/sections/").status_code == 404
