import pytest
from rest_framework import status
from rest_framework.test import APIClient

REGISTER_URL = "/api/auth/register/"


def user_profile_url(username: str) -> str:
    return f"/api/users/{username}/"


def user_comments_url(username: str) -> str:
    return f"/api/users/{username}/comments/"


def user_bookmarks_url(username: str) -> str:
    return f"/api/users/{username}/bookmarks/"


# ------------------------------------------------------------------
# フィクスチャ
# ------------------------------------------------------------------

@pytest.fixture
def target_user(db):
    """テスト対象の公開プロフィールを持つユーザー。"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        username="targetuser",
        email="target@example.com",
        password="targetpass123",
        bio="これはターゲットユーザーです。",
    )


@pytest.fixture
def target_auth_client(db, target_user) -> APIClient:
    """target_user としてログイン済みのクライアント。"""
    client = APIClient()
    client.post(
        REGISTER_URL,
        {"username": "dummy_for_login", "email": "d@example.com", "password": "dummypass123"},
        format="json",
    )
    # target_user はすでに作成済みなので force_authenticate を使う
    client.force_authenticate(user=target_user)
    return client


@pytest.fixture
def target_user_comment(db, target_user, verse):
    """target_user が作成したコメント。"""
    from comments.models import Comment
    return Comment.objects.create(
        user=target_user,
        verse=verse,
        body="ターゲットユーザーのコメントです。",
    )


@pytest.fixture
def target_user_bookmark(db, target_user, verse):
    """target_user が作成したブックマーク。"""
    from bookmarks.models import Bookmark
    return Bookmark.objects.create(user=target_user, verse=verse)


# ------------------------------------------------------------------
# GET /api/users/{username}/ - 公開プロフィール
# ------------------------------------------------------------------

@pytest.mark.django_db
class TestUserProfileView:
    def test_存在するユーザーのプロフィールを返す(self, api_client, target_user):
        res = api_client.get(user_profile_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert res.data["username"] == "targetuser"

    def test_存在しないユーザーで404(self, api_client):
        res = api_client.get(user_profile_url("nonexistentuser"))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_匿名アクセス可能(self, api_client, target_user):
        res = api_client.get(user_profile_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK

    def test_認証済みでもアクセス可能(self, auth_client, target_user):
        res = auth_client.get(user_profile_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK

    def test_返却フィールドにusernameが含まれる(self, api_client, target_user):
        res = api_client.get(user_profile_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert "username" in res.data

    def test_返却フィールドにbioが含まれる(self, api_client, target_user):
        res = api_client.get(user_profile_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert "bio" in res.data
        assert res.data["bio"] == "これはターゲットユーザーです。"

    def test_返却フィールドにavatar_urlが含まれる(self, api_client, target_user):
        res = api_client.get(user_profile_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert "avatar_url" in res.data

    def test_返却フィールドにcreated_atが含まれる(self, api_client, target_user):
        res = api_client.get(user_profile_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert "created_at" in res.data

    def test_メールアドレスが公開されない(self, api_client, target_user):
        res = api_client.get(user_profile_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert "email" not in res.data


# ------------------------------------------------------------------
# GET /api/users/{username}/comments/ - ユーザーのコメント一覧
# ------------------------------------------------------------------

@pytest.mark.django_db
class TestUserCommentsView:
    def test_そのユーザーのコメント一覧を返す(self, api_client, target_user, target_user_comment):
        res = api_client.get(user_comments_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1
        assert res.data[0]["body"] == "ターゲットユーザーのコメントです。"

    def test_匿名アクセス可能(self, api_client, target_user, target_user_comment):
        res = api_client.get(user_comments_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK

    def test_認証済みでもアクセス可能(self, auth_client, target_user, target_user_comment):
        res = auth_client.get(user_comments_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK

    def test_コメントがないとき空リストを返す(self, api_client, target_user):
        res = api_client.get(user_comments_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert res.data == []

    def test_存在しないユーザーで404(self, api_client):
        res = api_client.get(user_comments_url("nonexistentuser"))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_他ユーザーのコメントは含まれない(self, api_client, auth_client, target_user, target_user_comment, verse):
        """auth_client (testuser) がコメントを投稿しても targetuser の一覧には含まれない。"""
        auth_client.post(
            "/api/comments/",
            {"verse": str(verse.id), "body": "testuser のコメント"},
            format="json",
        )
        res = api_client.get(user_comments_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1
        assert all(c["body"] == "ターゲットユーザーのコメントです。" for c in res.data)


# ------------------------------------------------------------------
# GET /api/users/{username}/bookmarks/ - ユーザーのお気に入り一覧
# ------------------------------------------------------------------

@pytest.mark.django_db
class TestUserBookmarksView:
    def test_そのユーザーのお気に入り一覧を返す(self, api_client, target_user, target_user_bookmark):
        res = api_client.get(user_bookmarks_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1

    def test_匿名アクセス可能(self, api_client, target_user, target_user_bookmark):
        res = api_client.get(user_bookmarks_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK

    def test_認証済みでもアクセス可能(self, auth_client, target_user, target_user_bookmark):
        res = auth_client.get(user_bookmarks_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK

    def test_お気に入りがないとき空リストを返す(self, api_client, target_user):
        res = api_client.get(user_bookmarks_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert res.data == []

    def test_存在しないユーザーで404(self, api_client):
        res = api_client.get(user_bookmarks_url("nonexistentuser"))
        assert res.status_code == status.HTTP_404_NOT_FOUND

    def test_ブックマークにverse_detailが含まれる(self, api_client, target_user, target_user_bookmark, verse):
        res = api_client.get(user_bookmarks_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data) == 1
        bm = res.data[0]
        assert "verse_detail" in bm
        assert bm["verse_detail"]["id"] == str(verse.id)

    def test_他ユーザーのブックマークは含まれない(self, api_client, auth_client, target_user, target_user_bookmark, verse):
        """auth_client (testuser) がブックマークしても targetuser の一覧には含まれない。"""
        auth_client.post("/api/bookmarks/", {"verse": str(verse.id)}, format="json")
        res = api_client.get(user_bookmarks_url("targetuser"))
        assert res.status_code == status.HTTP_200_OK
        # target_user のブックマークのみ
        assert len(res.data) == 1
