import pytest
from rest_framework import status

SEARCH_URL = "/api/search/"


@pytest.fixture
def book(db):
    from tests.factories import make_book
    return make_book("マタイによる福音書", "口語訳", 1, slug="matthew")


@pytest.fixture
def book_kjv(db):
    from tests.factories import make_book
    return make_book("Matthew", "KJV", 1, slug="matthew")


@pytest.fixture
def book_mark(db):
    from tests.factories import make_book
    return make_book("マルコによる福音書", "口語訳", 2, slug="mark")


@pytest.fixture
def chapter(book):
    from bible.models import Chapter
    return Chapter.objects.create(book=book, number=1)


@pytest.fixture
def chapter_mark(book_mark):
    from bible.models import Chapter
    return Chapter.objects.create(book=book_mark, number=1)


@pytest.fixture
def chapter_kjv(book_kjv):
    from bible.models import Chapter
    return Chapter.objects.create(book=book_kjv, number=1)


@pytest.fixture
def verse(chapter):
    from bible.models import Verse
    return Verse.objects.create(
        chapter=chapter,
        number=1,
        text="アブラハムの子であるダビデの子、イエス・キリストの系図。",
    )


@pytest.fixture
def verse_kjv(chapter_kjv):
    from bible.models import Verse
    return Verse.objects.create(
        chapter=chapter_kjv,
        number=1,
        text="The book of the generation of Jesus Christ, the son of David.",
    )


@pytest.fixture
def verse_mark(chapter_mark):
    from bible.models import Verse
    return Verse.objects.create(
        chapter=chapter_mark,
        number=1,
        text="神の子イエス・キリストの福音のはじめ。",
    )


@pytest.fixture
def verse_bungo(db):
    # 口語訳と同じ箇所（matthew 1:1）を文語訳で作る（同一 canonical・章・節）。
    from bible.models import Chapter, Verse
    from tests.factories import make_book
    b = make_book("マタイ傳福音書", "文語訳", 1, slug="matthew")
    ch = Chapter.objects.create(book=b, number=1)
    return Verse.objects.create(chapter=ch, number=1, text="アブラハムの子イエス・キリストの系圖。")


@pytest.fixture
def search_user(db, django_user_model):
    return django_user_model.objects.create_user(username="searchuser", password="testpass123")


@pytest.fixture
def search_comment(search_user, verse):
    from tests.factories import make_comment
    return make_comment(user=search_user, verse=verse, body="イエスについてのコメント")


@pytest.fixture
def search_comment_mark(search_user, verse_mark):
    from tests.factories import make_comment
    return make_comment(user=search_user, verse=verse_mark, body="イエスに関するマルコのコメント")


@pytest.mark.django_db
class TestSearchView:
    def test_empty_query_returns_empty(self, api_client):
        res = api_client.get(SEARCH_URL, {"q": ""})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verses"] == []
        assert res.data["books"] == []

    def test_short_latin_query_returns_empty(self, api_client, verse):
        # ラテン1文字はノイズが多いので弾く
        res = api_client.get(SEARCH_URL, {"q": "a"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verses"] == []
        assert res.data["books"] == []

    def test_single_cjk_char_searches(self, api_client, verse):
        # CJK は1文字でも語として成立するので検索する（例: 「ア」で本文にヒット）
        res = api_client.get(SEARCH_URL, {"q": "ア"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["verses"]) == 1

    def test_verse_text_search(self, api_client, verse):
        res = api_client.get(SEARCH_URL, {"q": "アブラハム"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["verses"]) == 1
        assert res.data["verses"][0]["id"] == str(verse.id)
        assert res.data["verses"][0]["book_name"] == "マタイによる福音書"
        assert res.data["verses"][0]["chapter_number"] == 1
        assert res.data["verses"][0]["number"] == 1

    def test_book_name_search(self, api_client, book):
        res = api_client.get(SEARCH_URL, {"q": "マタイ"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["books"]) == 1
        assert res.data["books"][0]["name"] == "マタイによる福音書"

    def test_case_insensitive_search(self, api_client, verse):
        res = api_client.get(SEARCH_URL, {"q": "イエス"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["verses"]) >= 1

    def test_no_results_for_unmatched_query(self, api_client, verse, book):
        res = api_client.get(SEARCH_URL, {"q": "xxxxxxxxxx"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verses"] == []
        assert res.data["books"] == []

    def test_search_includes_kjv_verses(self, api_client, verse, verse_kjv):
        # lang=en では KJV 節が検索対象
        res = api_client.get(SEARCH_URL, {"q": "Jesus", "lang": "en"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["verses"]) == 1
        assert res.data["verses"][0]["id"] == str(verse_kjv.id)

    def test_search_includes_kjv_books(self, api_client, book, book_kjv):
        # lang=en では KJV 書名が検索対象
        res = api_client.get(SEARCH_URL, {"q": "Matthew", "lang": "en"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["books"]) == 1
        assert res.data["books"][0]["name"] == "Matthew"

    def test_lang_scopes_out_other_language(self, api_client, verse, verse_kjv):
        # 既定 lang=ja では英語(KJV)の節は返らない（言語スコープ）
        res = api_client.get(SEARCH_URL, {"q": "Jesus"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verses"] == []

    def test_anonymous_access_allowed(self, api_client, verse):
        res = api_client.get(SEARCH_URL, {"q": "アブラハム"})
        assert res.status_code == status.HTTP_200_OK

    def test_verse_result_includes_required_fields(self, api_client, verse):
        res = api_client.get(SEARCH_URL, {"q": "アブラハム"})
        assert res.status_code == status.HTTP_200_OK
        v = res.data["verses"][0]
        assert "id" in v
        assert "number" in v
        assert "text" in v
        assert "chapter_number" in v
        assert "chapter_id" in v
        assert "book_name" in v
        assert "book_id" in v

    def test_page_size_and_pagination(self, db, api_client, chapter):
        # 1ページ50件。超えたら has_more=True で次ページに残りが出る。
        from bible.models import Verse
        for i in range(1, 121):
            Verse.objects.create(chapter=chapter, number=i, text=f"イエス・キリスト {i}")
        res1 = api_client.get(SEARCH_URL, {"q": "イエス", "page": 1})
        assert res1.status_code == status.HTTP_200_OK
        assert len(res1.data["verses"]) == 50
        assert res1.data["verse_total"] == 120
        assert res1.data["has_more"] is True
        res2 = api_client.get(SEARCH_URL, {"q": "イエス", "page": 2})
        assert len(res2.data["verses"]) == 50
        assert res2.data["has_more"] is True
        res3 = api_client.get(SEARCH_URL, {"q": "イエス", "page": 3})
        assert len(res3.data["verses"]) == 20
        assert res3.data["has_more"] is False
        # ページ間で重複しない
        ids1 = {v["id"] for v in res1.data["verses"]}
        ids2 = {v["id"] for v in res2.data["verses"]}
        ids3 = {v["id"] for v in res3.data["verses"]}
        assert ids1.isdisjoint(ids2)
        assert ids2.isdisjoint(ids3)
        assert ids1.isdisjoint(ids3)

    def test_returns_both_verses_and_books(self, api_client, verse, book):
        # 「マタイ」は書名にも節テキストにも（系図という意味では）合致しないが、
        # 書名ヒットが返ることを確認
        res = api_client.get(SEARCH_URL, {"q": "マタイ"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["books"]) >= 1

    def test_dedup_same_passage_across_translations(self, api_client, verse, verse_bungo):
        # 口語訳と文語訳の同一箇所は代表訳(口語訳)1件に集約される（lang=ja）
        res = api_client.get(SEARCH_URL, {"q": "イエス"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verse_total"] == 1
        assert res.data["verses"][0]["id"] == str(verse.id)

    def test_verse_result_includes_book_slug(self, api_client, verse):
        res = api_client.get(SEARCH_URL, {"q": "アブラハム"})
        assert res.data["verses"][0]["book_slug"] == "matthew"

    def test_kind_filter_books_only(self, api_client, book, verse, search_comment):
        res = api_client.get(SEARCH_URL, {"q": "マタイ", "kind": "books"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["books"]) == 1
        assert res.data["books"][0]["name"] == "マタイによる福音書"
        assert res.data["verses"] == []
        assert res.data["comments"] == []
        assert res.data["verse_total"] == 0
        assert res.data["has_more"] is False

    def test_kind_filter_verses_only(self, api_client, verse, search_comment):
        res = api_client.get(SEARCH_URL, {"q": "イエス", "kind": "verses"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["verses"]) == 1
        assert res.data["comments"] == []
        assert res.data["books"] == []
        assert res.data["verse_total"] == 1

    def test_kind_filter_comments_only(self, api_client, verse, search_comment):
        res = api_client.get(SEARCH_URL, {"q": "イエス", "kind": "comments"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verses"] == []
        assert res.data["books"] == []
        assert res.data["verse_total"] == 0
        assert len(res.data["comments"]) == 1
        assert res.data["comments"][0]["id"] == str(search_comment.id)

    def test_book_filter_limits_verse_results_by_slug(self, api_client, verse, verse_mark):
        res = api_client.get(SEARCH_URL, {"q": "イエス", "book": "mark"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verse_total"] == 1
        assert len(res.data["verses"]) == 1
        assert res.data["verses"][0]["id"] == str(verse_mark.id)
        assert res.data["verses"][0]["book_slug"] == "mark"

    def test_book_filter_limits_comment_results_by_slug(
        self, api_client, verse, verse_mark, search_comment, search_comment_mark
    ):
        res = api_client.get(SEARCH_URL, {"q": "イエス", "kind": "comments", "book": "mark"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["comments"]) == 1
        assert res.data["comments"][0]["id"] == str(search_comment_mark.id)
