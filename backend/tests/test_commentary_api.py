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


def work(slug, year, sections, tradition="patristic", readable=True):
    return {
        "slug": slug, "title": slug.title(), "title_ja": f"{slug}の本", "author": "A", "author_ja": "著者",
        "year": year, "tradition": tradition, "language": "en", "translator": "", "source_name": "S",
        "source_url": "https://example.org/", "license": "public-domain", "license_note": "note",
        "readable": readable, "sections": sections,
    }


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def works(db):
    load_work(work("calvin", 1555, [
        {"heading": "Romans 8:28", "text": "C" * 400, "links": [link("romans", 8, 28)]},
        {"heading": "Romans 8:29-30", "text": "range", "links": [link("romans", 8, 29, 8, 30)]},
    ], tradition="reformation"))
    load_work(work("augustine", 420, [
        {"heading": "Book I", "text": "cites Rom 8:28", "links": [
            link("romans", 8, 28, method="citation"),
            link("romans", 8, 28, method="structure"),  # 同じ区切りに2通りの結び付き → 1件にまとまる
        ]},
        {"heading": "Book II", "text": "whole chapter", "links": [link("romans", 8, None, 8, None, method="citation")]},
        {"heading": "Book III", "text": "across chapters", "links": [link("romans", 7, 20, 8, 2, method="citation")]},
    ]))
    load_work(work("uchimura", 1924, [
        {"heading": "第1講", "text": "whole book", "links": [{"book": "romans", "chapter": None, "verse": None,
                                                           "chapter_end": None, "verse_end": None,
                                                           "method": "structure", "confidence": None}]},
        {"heading": "AI", "text": "guess", "links": [link("romans", 8, 28, method="ai", confidence=0.9)]},
    ], tradition="mukyokai"))


def passage(client, **params):
    res = client.get("/api/commentary/passage/", params)
    assert res.status_code == 200
    return res.json()


def headings(client, **params):
    return [(r["work"]["slug"], r["heading"], r["method"]) for r in passage(client, **params)["results"]]


@pytest.mark.django_db
class TestPassage:
    def test_discuss_is_verse_level_structure_by_year(self, client, works):
        # 同じ区切りに構造と引用の両方があれば、論じているほうに1件で出る
        assert headings(client, book="romans", chapter=8, verse=28) == [
            ("augustine", "Book I", "structure"),
            ("calvin", "Romans 8:28", "structure"),
        ]

    def test_broad_is_whole_chapter_or_book(self, client, works):
        assert headings(client, book="romans", chapter=8, verse=28, kind="broad") == [
            ("uchimura", "第1講", "structure"),
        ]

    def test_mention_excludes_discussed_sections(self, client, works):
        assert headings(client, book="romans", chapter=8, verse=28, kind="mention") == [
            ("augustine", "Book II", "citation"),
            ("uchimura", "AI", "ai"),
        ]

    def test_ai_keeps_confidence_others_do_not(self, client, works):
        by_heading = {r["heading"]: r for r in passage(client, book="romans", chapter=8, verse=28, kind="mention")["results"]}
        assert by_heading["AI"]["confidence"] == 0.9
        assert by_heading["Book II"]["confidence"] is None

    def test_ranges(self, client, works):
        assert ("augustine", "Book III", "citation") in headings(client, book="romans", chapter=8, verse=2, kind="mention")
        assert all(h[1] != "Book III" for h in headings(client, book="romans", chapter=8, verse=3, kind="mention"))
        assert ("calvin", "Romans 8:29-30", "structure") in headings(client, book="romans", chapter=8, verse=30)

    def test_chapter_view(self, client, works):
        # 章を見るときは「章に掛かる構造」が論じるもの、書全体が broad
        discuss = {h[1] for h in headings(client, book="romans", chapter=8)}
        assert discuss == {"Romans 8:28", "Romans 8:29-30", "Book I"}
        assert {h[1] for h in headings(client, book="romans", chapter=8, kind="broad")} == {"第1講"}

    def test_excerpt_is_trimmed(self, client, works):
        calvin = next(r for r in passage(client, book="romans", chapter=8, verse=28)["results"] if r["work"]["slug"] == "calvin")
        assert len(calvin["excerpt"]) == 280
        assert calvin["truncated"] is True

    def test_tradition_filter(self, client, works):
        assert headings(client, book="romans", chapter=8, verse=28, kind="broad", tradition="patristic") == []

    def test_bad_params_return_empty(self, client, works):
        assert passage(client, book="romans")["results"] == []
        assert passage(client, chapter=8)["results"] == []
        assert passage(client, book="romans", chapter=8, verse=28, kind="nope")["results"] == []
        assert passage(client, book="john", chapter=8, verse=28)["results"] == []


@pytest.mark.django_db
class TestWorks:
    def test_list_is_ordered_by_year_with_counts(self, client, works):
        res = client.get("/api/commentary/works/")
        assert res.status_code == 200
        assert [(w["slug"], w["section_count"]) for w in res.json()] == [
            ("augustine", 3), ("calvin", 2), ("uchimura", 2),
        ]
        assert res.json()[0]["license"] == "public-domain"

    def test_detail(self, client, works):
        res = client.get("/api/commentary/works/calvin/")
        assert res.status_code == 200
        assert res.json()["tradition"] == "reformation"
        assert client.get("/api/commentary/works/nope/").status_code == 404

    def test_sections_in_order_with_links(self, client, works):
        res = client.get("/api/commentary/works/augustine/sections/")
        data = res.json()
        assert [s["order"] for s in data["results"]] == [0, 1, 2]
        assert data["results"][2]["links"][0] == {
            "book": "romans", "chapter": 7, "verse": 20, "chapter_end": 8, "verse_end": 2,
            "method": "citation", "confidence": None,
        }

    def test_sections_around(self, client, works):
        # 1ページ2件で order=2 を含むページは2ページ目
        data = client.get("/api/commentary/works/augustine/sections/", {"around": 2, "page_size": 2}).json()
        assert [s["order"] for s in data["results"]] == [2]
        # page を明示したらそちらが優先
        data = client.get("/api/commentary/works/augustine/sections/", {"around": 2, "page_size": 2, "page": 1}).json()
        assert [s["order"] for s in data["results"]] == [0, 1]

    def test_sections_unknown_work(self, client, works):
        assert client.get("/api/commentary/works/nope/sections/").status_code == 404
