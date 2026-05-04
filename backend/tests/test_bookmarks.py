import pytest
from rest_framework import status

BOOKMARKS_URL = "/api/bookmarks/"


def bookmark_url(bookmark_id):
    return f"/api/bookmarks/{bookmark_id}/"


@pytest.fixture
def other_auth_client(db, other_user_payload):
    from rest_framework.test import APIClient
    from tests.conftest import REGISTER_URL
    client = APIClient()
    client.post(REGISTER_URL, other_user_payload, format="json")
    return client


@pytest.fixture
def bookmark(db, auth_client, verse):
    res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
    return res.data


# ------------------------------------------------------------------
# ブックマーク追加
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkCreate:
    def test_authenticated_can_bookmark(self, auth_client, verse):
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["verse_detail"]["id"] == str(verse.id)

    def test_anonymous_cannot_bookmark(self, api_client, verse):
        res = api_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_duplicate_bookmark_is_409(self, auth_client, verse, bookmark):
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT


# ------------------------------------------------------------------
# ブックマーク一覧
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkList:
    def test_authenticated_can_list(self, auth_client, bookmark):
        res = auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1

    def test_anonymous_cannot_list(self, api_client, bookmark):
        res = api_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_only_own_bookmarks_are_returned(self, auth_client, other_auth_client, verse, bookmark):
        """他ユーザーのブックマークは見えない。"""
        res = other_auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 0

    def test_verse_detail_is_included(self, auth_client, bookmark, verse):
        res = auth_client.get(BOOKMARKS_URL)
        detail = res.data[0]["verse_detail"]
        assert detail["id"] == str(verse.id)
        assert "book_name" in detail
        assert "chapter_number" in detail


# ------------------------------------------------------------------
# ブックマーク削除
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkDelete:
    def test_owner_can_delete(self, auth_client, bookmark):
        res = auth_client.delete(bookmark_url(bookmark["id"]))
        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_other_user_cannot_delete(self, other_auth_client, bookmark):
        res = other_auth_client.delete(bookmark_url(bookmark["id"]))
        assert res.status_code == status.HTTP_403_FORBIDDEN

    def test_anonymous_cannot_delete(self, api_client, bookmark):
        res = api_client.delete(bookmark_url(bookmark["id"]))
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_delete_removes_record(self, auth_client, bookmark):
        from bookmarks.models import Bookmark
        auth_client.delete(bookmark_url(bookmark["id"]))
        assert not Bookmark.objects.filter(id=bookmark["id"]).exists()
