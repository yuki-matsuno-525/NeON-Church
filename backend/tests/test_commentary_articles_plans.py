"""記事からの解釈書の引用と、プランに解釈書の章を入れるテスト。"""

import pytest

from articles.citations import parse_reference
from commentary.loader import CommentaryDataError, load_work

WORK = {
    "slug": "uchimura-romans", "title": "羅馬書之研究", "title_ja": "ロマ書の研究", "author": "Uchimura",
    "author_ja": "内村鑑三", "year": 1924, "tradition": "mukyokai", "language": "ja", "translator": "",
    "source_name": "S", "source_url": "https://example.org/", "license": "public-domain", "license_note": "",
    "readable": True,
    "chapters": [
        {"number": 0, "title": "序", "links": [], "sections": [{"text": "序文"}]},
        {"number": 41, "title": "第41講　救いの完成", "links": [],
         "sections": [{"text": "一段落目"}, {"text": "二段落目"}, {"text": "三段落目"}]},
    ],
}


@pytest.fixture
def work(db):
    return load_work(dict(WORK))[0]


def create_article(client, body):
    return client.post("/api/articles/", {
        "title": "内村を読む", "summary": "講義から", "body": body, "visibility": "public",
    }, format="json")


def test_parse_commentary_reference():
    assert parse_reference("@uchimura-romans 41:2-3") == {
        "commentary": True, "book_slug": "uchimura-romans", "chapter_number": 41,
        "verse_number_start": 2, "verse_number_end": 3, "translation": "",
    }
    assert parse_reference("@uchimura-romans 0")["chapter_number"] == 0
    # 解釈書に訳の指定は無い
    assert parse_reference("@uchimura-romans 41:2|greek") is None
    assert parse_reference("matthew 1:1")["commentary"] is False


@pytest.mark.django_db
class TestArticleCitations:
    def test_citations_resolve_in_body_order(self, auth_client, api_client, work):
        res = create_article(auth_client, "内村は [[@uchimura-romans 41:2]] と言う。\n\n{{@uchimura-romans 41:2-3}}\n\n序 [[@uchimura-romans 0]]")
        assert res.status_code == 201, res.content
        data = api_client.get(f"/api/articles/{res.json()['id']}/").json()
        cites = data["citations"]
        assert [c["raw"] for c in cites] == [
            "[[@uchimura-romans 41:2]]", "{{@uchimura-romans 41:2-3}}", "[[@uchimura-romans 0]]",
        ]
        inline, block, chapter = cites
        assert (inline["found"], inline["commentary_work"], inline["label"]) == (
            True, "uchimura-romans", "ロマ書の研究 › 第41講　救いの完成 › 2",
        )
        assert [v["text"] for v in block["verses"]] == ["二段落目", "三段落目"]
        assert block["label"] == "ロマ書の研究 › 第41講　救いの完成 › 2–3"
        assert chapter["label"] == "ロマ書の研究 › 序"

    def test_unknown_work_or_missing_section(self, auth_client, api_client, work):
        res = create_article(auth_client, "[[@no-such 1:1]] {{@uchimura-romans 41:9}}")
        cites = api_client.get(f"/api/articles/{res.json()['id']}/").json()["citations"]
        # 無い解釈書の印は索引に入らず、無い区切りの引用ブロックは「見つかりません」
        assert [(c["raw"], c["found"]) for c in cites] == [("{{@uchimura-romans 41:9}}", False)]

    def test_citing_articles_for_a_section(self, auth_client, api_client, work):
        create_article(auth_client, "{{@uchimura-romans 41:2-3}}")
        hit = api_client.get("/api/articles/citing/", {"work": "uchimura-romans", "chapter": 41, "verse": 3}).json()
        miss = api_client.get("/api/articles/citing/", {"work": "uchimura-romans", "chapter": 41, "verse": 1}).json()
        chapter0 = api_client.get("/api/articles/citing/", {"work": "uchimura-romans", "chapter": 0}).json()
        assert (hit["count"], miss["count"], chapter0["count"]) == (1, 0, 0)

    def test_cited_section_is_protected_from_reimport(self, auth_client, work):
        create_article(auth_client, "{{@uchimura-romans 41:2-3}}")
        changed = dict(WORK)
        changed["chapters"] = [dict(c) for c in WORK["chapters"]]
        changed["chapters"][1] = {**changed["chapters"][1], "sections": [
            {"text": "一段落目"}, {"text": "書き換え"}, {"text": "三段落目"},
        ]}
        with pytest.raises(CommentaryDataError, match="41:2"):
            load_work(changed)


@pytest.mark.django_db
class TestPlanReadings:
    def make_day(self, client):
        plan_id = client.post("/api/plans/", {"title": "内村とロマ書", "description": "d"}, format="json").json()["id"]
        day_id = client.post(f"/api/plans/{plan_id}/days/", {"title": "1日目"}, format="json").json()["id"]
        return plan_id, day_id

    def test_mix_bible_and_commentary_chapters(self, auth_client, work):
        from bible.models import CanonicalBook

        CanonicalBook.objects.get_or_create(slug="romans")
        plan_id, day_id = self.make_day(auth_client)
        res = auth_client.patch(f"/api/plans/{plan_id}/days/{day_id}/", {"readings": [
            {"book": "romans", "chapter_number": 8},
            {"work": "uchimura-romans", "chapter_number": 41, "translation": "KJV"},
        ]}, format="json")
        assert res.status_code == 200, res.content
        readings = res.json()["readings"]
        assert [(r["book"], r["work"], r["chapter_number"]) for r in readings] == [
            ("romans", None, 8), (None, "uchimura-romans", 41),
        ]
        commentary = readings[1]
        assert (commentary["book_name"], commentary["chapter_title"], commentary["translation"]) == (
            "ロマ書の研究", "第41講　救いの完成", "",
        )

    @pytest.mark.parametrize("reading", [
        {"work": "uchimura-romans", "chapter_number": 7},  # 無い章
        {"book": "romans", "work": "uchimura-romans", "chapter_number": 8},  # 両方
        {"chapter_number": 8},  # どちらも無い
    ])
    def test_bad_readings_are_rejected(self, auth_client, work, reading):
        from bible.models import CanonicalBook

        CanonicalBook.objects.get_or_create(slug="romans")
        plan_id, day_id = self.make_day(auth_client)
        res = auth_client.patch(f"/api/plans/{plan_id}/days/{day_id}/", {"readings": [reading]}, format="json")
        assert res.status_code == 400

    def test_planned_chapter_is_protected_from_reimport(self, auth_client, work):
        plan_id, day_id = self.make_day(auth_client)
        auth_client.patch(f"/api/plans/{plan_id}/days/{day_id}/", {"readings": [
            {"work": "uchimura-romans", "chapter_number": 41},
        ]}, format="json")
        changed = dict(WORK)
        changed["chapters"] = [WORK["chapters"][0]]
        with pytest.raises(CommentaryDataError, match="41章"):
            load_work(changed)
