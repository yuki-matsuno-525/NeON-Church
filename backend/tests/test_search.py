import pytest
from rest_framework import status

SEARCH_URL = "/api/search/"


@pytest.fixture
def book(db):
    from bible.models import Book
    return Book.objects.create(name="マタイによる福音書", translation="口語訳", order=1)


@pytest.fixture
def book_kjv(db):
    from bible.models import Book
    return Book.objects.create(name="Matthew", translation="KJV", order=1)


@pytest.fixture
def chapter(book):
    from bible.models import Chapter
    return Chapter.objects.create(book=book, number=1)


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


@pytest.mark.django_db
class TestSearchView:
    def test_empty_query_returns_empty(self, api_client):
        res = api_client.get(SEARCH_URL, {"q": ""})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verses"] == []
        assert res.data["books"] == []

    def test_short_query_returns_empty(self, api_client, verse):
        res = api_client.get(SEARCH_URL, {"q": "ア"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verses"] == []
        assert res.data["books"] == []

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

    def test_search_excludes_non_kogo_translation_verses(self, api_client, verse, verse_kjv):
        # KJV 節は除外される
        res = api_client.get(SEARCH_URL, {"q": "Jesus"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["verses"] == []

    def test_search_excludes_non_kogo_translation_books(self, api_client, book, book_kjv):
        # KJV 書名は除外される
        res = api_client.get(SEARCH_URL, {"q": "Matthew"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["books"] == []

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

    def test_max_30_verses_returned(self, db, api_client, chapter):
        from bible.models import Verse
        for i in range(1, 36):
            Verse.objects.create(chapter=chapter, number=i, text=f"イエス・キリスト {i}")
        res = api_client.get(SEARCH_URL, {"q": "イエス"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["verses"]) <= 30

    def test_returns_both_verses_and_books(self, api_client, verse, book):
        # 「マタイ」は書名にも節テキストにも（系図という意味では）合致しないが、
        # 書名ヒットが返ることを確認
        res = api_client.get(SEARCH_URL, {"q": "マタイ"})
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data["books"]) >= 1
