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


@pytest.fixture
def comment(db, auth_client, verse):
    from django.contrib.auth import get_user_model
    from tests.factories import make_comment
    User = get_user_model()
    user = User.objects.get(username="testuser")
    return make_comment(user=user, verse=verse, body="テストコメント")


# ------------------------------------------------------------------
# ブックマーク追加
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkCreate:
    def test_authenticated_can_bookmark(self, auth_client, verse):
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["target_type"] == "verse"
        assert res.data["reference"]["verse"] == verse.number

    def test_anonymous_cannot_bookmark(self, api_client, verse):
        res = api_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_duplicate_bookmark_is_409(self, auth_client, verse, bookmark):
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT

    def test_verse_bookmark_stores_canonical_location(self, auth_client, verse):
        # 段階5F: verse_id 入力から箇所（canonical_book/章番号/節番号）が backend 導出で保存される
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        from bookmarks.models import Bookmark
        bm = Bookmark.objects.get()
        assert bm.canonical_book.slug == "matthew"
        assert bm.chapter_number == verse.chapter.number
        assert bm.verse_number == verse.number

    def test_comment_bookmark_has_null_location(self, auth_client, comment):
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        from bookmarks.models import Bookmark
        bm = Bookmark.objects.get(comment=comment)
        assert bm.canonical_book_id is None
        assert bm.chapter_number is None
        assert bm.verse_number is None

    def test_same_location_other_translation_is_409(self, auth_client, verse):
        # 口語訳マタイ1:1 を栞 → 同じ箇所の KJV 版 Verse は 409（別訳でも同一箇所は二重不可）
        from bible.models import Chapter, Verse
        from bookmarks.models import Bookmark
        from tests.factories import make_book

        assert auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json").status_code == 201

        kjv = make_book("Matthew", "KJV", 1, slug="matthew")
        kjv_ch = Chapter.objects.create(book=kjv, number=verse.chapter.number)
        kjv_verse = Verse.objects.create(chapter=kjv_ch, number=verse.number, text="For God so loved")

        res = auth_client.post(BOOKMARKS_URL, {"verse": str(kjv_verse.id)}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT
        # 失敗時に不完全な Bookmark を残さない（最初の1件だけ）
        assert Bookmark.objects.count() == 1

    def test_different_location_can_bookmark(self, auth_client, verse):
        # 同じ書の別の節（2:1）は別箇所なので登録できる
        from bible.models import Chapter, Verse

        assert auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json").status_code == 201
        ch2 = Chapter.objects.create(book=verse.chapter.book, number=2)
        v2 = Verse.objects.create(chapter=ch2, number=1, text="x")

        res = auth_client.post(BOOKMARKS_URL, {"verse": str(v2.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED

    def test_comment_bookmark_not_blocked_by_verse_location(self, auth_client, verse, comment):
        # 同じ箇所に verse 栞があっても、その節へのコメント栞は作成できる
        auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED

    def test_verse_bookmark_response_includes_reference(self, auth_client, verse):
        # 段階5D: レスポンスに訳非依存の箇所 reference が入る
        res = auth_client.post(BOOKMARKS_URL, {"verse": str(verse.id)}, format="json")
        assert res.data["reference"] == {
            "book": "matthew",
            "chapter": verse.chapter.number,
            "verse": verse.number,
        }

    def test_comment_bookmark_reference_is_null(self, auth_client, comment):
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.data["reference"] is None


# ------------------------------------------------------------------
# ブックマーク一覧
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestBookmarkList:
    def test_authenticated_can_list(self, auth_client, bookmark):
        res = auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1

    def test_anonymous_cannot_list(self, api_client, bookmark):
        res = api_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_only_own_bookmarks_are_returned(self, auth_client, other_auth_client, verse, bookmark):
        """他ユーザーのブックマークは見えない。"""
        res = other_auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 0

    def test_reference_is_included(self, auth_client, bookmark, verse):
        res = auth_client.get(BOOKMARKS_URL)
        ref = res.data["results"][0]["reference"]
        assert ref["book"] == "matthew"
        assert ref["chapter"] == verse.chapter.number
        assert ref["verse"] == verse.number

    def test_verse_bookmark_list_includes_verse_text(self, auth_client, bookmark, verse):
        # 一覧では表示用に節本文（verse_text）を返す（プロフィールで内容が分かるようにするため）。
        res = auth_client.get(BOOKMARKS_URL)
        item = res.data["results"][0]
        assert item["target_type"] == "verse"
        assert item["verse_text"] == verse.text


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


# ------------------------------------------------------------------
# コメントブックマーク
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestCommentBookmark:
    def test_can_bookmark_comment(self, auth_client, comment):
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["target_type"] == "comment"
        assert res.data["comment_detail"]["id"] == str(comment.id)

    def test_duplicate_comment_bookmark_is_409(self, auth_client, comment):
        auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        assert res.status_code == status.HTTP_409_CONFLICT

    def test_comment_bookmark_appears_in_list(self, auth_client, comment):
        auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        res = auth_client.get(BOOKMARKS_URL)
        assert res.status_code == status.HTTP_200_OK
        assert res.data["count"] == 1
        assert res.data["results"][0]["target_type"] == "comment"

    def test_empty_body_is_rejected(self, auth_client):
        res = auth_client.post(BOOKMARKS_URL, {}, format="json")
        assert res.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT, status.HTTP_500_INTERNAL_SERVER_ERROR)

    def test_can_delete_comment_bookmark(self, auth_client, comment):
        res = auth_client.post(BOOKMARKS_URL, {"comment": str(comment.id)}, format="json")
        bm_id = res.data["id"]
        del_res = auth_client.delete(bookmark_url(bm_id))
        assert del_res.status_code == status.HTTP_204_NO_CONTENT
