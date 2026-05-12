"""
読書進捗 API テスト。
GET  /api/reading-progress/      — 自分の進捗一覧
POST /api/reading-progress/save/ — 進捗を upsert
"""

import pytest
from rest_framework import status

PROGRESS_LIST_URL = "/api/reading-progress/"
PROGRESS_SAVE_URL = "/api/reading-progress/save/"


@pytest.mark.django_db
class TestReadingProgressList:
    def test_requires_auth(self, api_client):
        res = api_client.get(PROGRESS_LIST_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_empty_list_for_new_user(self, auth_client):
        res = auth_client.get(PROGRESS_LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data == []

    def test_returns_own_progress(self, auth_client, book, chapter):
        auth_client.post(
            PROGRESS_SAVE_URL,
            {"book": str(book.id), "chapter": str(chapter.id)},
            format="json",
        )
        res = auth_client.get(PROGRESS_LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1
        assert res.data[0]["chapter_number"] == chapter.number

    def test_does_not_return_other_user_progress(
        self, auth_client, api_client, other_user_payload, book, chapter
    ):
        api_client.post("/api/auth/register/", other_user_payload, format="json")
        api_client.post(
            PROGRESS_SAVE_URL,
            {"book": str(book.id), "chapter": str(chapter.id)},
            format="json",
        )

        res = auth_client.get(PROGRESS_LIST_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data == []


@pytest.mark.django_db
class TestReadingProgressSave:
    def test_requires_auth(self, api_client, book, chapter):
        res = api_client.post(
            PROGRESS_SAVE_URL,
            {"book": str(book.id), "chapter": str(chapter.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_progress(self, auth_client, book, chapter):
        res = auth_client.post(
            PROGRESS_SAVE_URL,
            {"book": str(book.id), "chapter": str(chapter.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["chapter_number"] == chapter.number

    def test_upsert_updates_existing(self, auth_client, book):
        from bible.models import Chapter
        ch1 = Chapter.objects.create(book=book, number=1)
        ch2 = Chapter.objects.create(book=book, number=2)

        auth_client.post(
            PROGRESS_SAVE_URL,
            {"book": str(book.id), "chapter": str(ch1.id)},
            format="json",
        )
        res = auth_client.post(
            PROGRESS_SAVE_URL,
            {"book": str(book.id), "chapter": str(ch2.id)},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        assert res.data["chapter_number"] == 2

        progress_res = auth_client.get(PROGRESS_LIST_URL)
        assert len(progress_res.data) == 1

    def test_missing_book_returns_400(self, auth_client, chapter):
        res = auth_client.post(
            PROGRESS_SAVE_URL,
            {"chapter": str(chapter.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_chapter_returns_400(self, auth_client, book):
        res = auth_client.post(
            PROGRESS_SAVE_URL,
            {"book": str(book.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_progress_serializer_includes_book_name(self, auth_client, book, chapter):
        res = auth_client.post(
            PROGRESS_SAVE_URL,
            {"book": str(book.id), "chapter": str(chapter.id)},
            format="json",
        )
        assert res.status_code == status.HTTP_201_CREATED
        assert "book_name" in res.data
        assert res.data["book_name"] == book.name
