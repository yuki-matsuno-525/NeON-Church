import pytest
from rest_framework import status

BOOKS_URL = "/api/books/"


def chapter_url(book_id):
    return f"/api/books/{book_id}/chapters/"


def verse_url(chapter_id):
    return f"/api/chapters/{chapter_id}/verses/"


# ------------------------------------------------------------------
# フィクスチャ
# ------------------------------------------------------------------
@pytest.fixture
def book(db):
    from bible.models import Book
    return Book.objects.create(name="マタイによる福音書", translation="口語訳", order=1)


@pytest.fixture
def chapter(book):
    from bible.models import Chapter
    return Chapter.objects.create(book=book, number=1)


@pytest.fixture
def verse(chapter):
    from bible.models import Verse
    return Verse.objects.create(
        chapter=chapter,
        number=1,
        text="アブラハムの子であるダビデの子、イエス・キリストの系図。",
    )


# ------------------------------------------------------------------
# 書一覧 GET /api/books/
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookList:
    def test_returns_books(self, api_client, book):
        res = api_client.get(BOOKS_URL)

        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1
        assert res.data[0]["name"] == book.name
        assert res.data[0]["translation"] == book.translation

    def test_anonymous_access(self, api_client, book):
        # 認証なしでアクセスできることを確認
        res = api_client.get(BOOKS_URL)
        assert res.status_code == status.HTTP_200_OK

    def test_ordered_by_order_field(self, db, api_client):
        from bible.models import Book
        Book.objects.create(name="ヨハネによる福音書", translation="口語訳", order=4)
        Book.objects.create(name="マタイによる福音書", translation="口語訳", order=1)

        res = api_client.get(BOOKS_URL)

        assert res.data[0]["order"] == 1
        assert res.data[1]["order"] == 4


# ------------------------------------------------------------------
# 章一覧 GET /api/books/{id}/chapters/
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestChapterList:
    def test_returns_chapters(self, api_client, chapter):
        res = api_client.get(chapter_url(chapter.book.id))

        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1
        assert res.data[0]["number"] == 1

    def test_nonexistent_book_returns_404(self, api_client):
        import uuid
        res = api_client.get(chapter_url(uuid.uuid4()))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_anonymous_access(self, api_client, chapter):
        res = api_client.get(chapter_url(chapter.book.id))
        assert res.status_code == status.HTTP_200_OK


# ------------------------------------------------------------------
# 節一覧 GET /api/chapters/{id}/verses/
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestVerseList:
    def test_returns_verses(self, api_client, verse):
        res = api_client.get(verse_url(verse.chapter.id))

        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1
        assert res.data[0]["number"] == 1
        assert res.data[0]["text"] == verse.text

    def test_nonexistent_chapter_returns_404(self, api_client):
        import uuid
        res = api_client.get(verse_url(uuid.uuid4()))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_anonymous_access(self, api_client, verse):
        res = api_client.get(verse_url(verse.chapter.id))
        assert res.status_code == status.HTTP_200_OK


# ------------------------------------------------------------------
# 今日の聖句 GET /api/verse-of-the-day/
# ------------------------------------------------------------------
VERSE_OF_DAY_URL = "/api/verse-of-the-day/"


@pytest.fixture
def kjv_verse(book):
    """口語訳マタイ1:1 と同じ書順・章・節の KJV 節。"""
    from bible.models import Book, Chapter, Verse
    kjv_book = Book.objects.create(name="Matthew", translation="KJV", order=1)
    kjv_chapter = Chapter.objects.create(book=kjv_book, number=1)
    return Verse.objects.create(
        chapter=kjv_chapter,
        number=1,
        text="The book of the generation of Jesus Christ, the son of David, the son of Abraham.",
    )


@pytest.mark.django_db
class TestVerseOfDay:
    @pytest.fixture(autouse=True)
    def _clear_cache(self):
        from django.core.cache import cache
        cache.clear()
        yield
        cache.clear()

    def test_includes_translation_field(self, api_client, verse):
        res = api_client.get(VERSE_OF_DAY_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["translation"] == "口語訳"

    def test_kjv_returns_kjv_translation(self, api_client, verse, kjv_verse):
        res = api_client.get(VERSE_OF_DAY_URL, {"translation": "KJV"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["translation"] == "KJV"
        assert res.data["text"] == kjv_verse.text

    def test_kjv_falls_back_to_kougo_translation(self, api_client, verse):
        # KJV に対応節が無ければ口語訳へフォールバックし、translation も口語訳になる
        res = api_client.get(VERSE_OF_DAY_URL, {"translation": "KJV"})
        assert res.status_code == status.HTTP_200_OK
        assert res.data["translation"] == "口語訳"
