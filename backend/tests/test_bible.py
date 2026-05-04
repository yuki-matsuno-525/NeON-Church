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
