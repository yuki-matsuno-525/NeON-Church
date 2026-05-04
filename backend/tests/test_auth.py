import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()

REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
REFRESH_URL = "/api/auth/token/refresh/"


# ------------------------------------------------------------------
# 登録
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestRegister:
    def test_success(self, api_client, user_payload):
        res = api_client.post(REGISTER_URL, user_payload, format="json")

        assert res.status_code == status.HTTP_201_CREATED
        assert res.data["username"] == user_payload["username"]
        assert "access_token" in res.cookies
        assert "refresh_token" in res.cookies
        assert res.cookies["access_token"]["httponly"]
        assert res.cookies["refresh_token"]["httponly"]

    def test_duplicate_username(self, api_client, user_payload):
        api_client.post(REGISTER_URL, user_payload, format="json")
        res = api_client.post(REGISTER_URL, user_payload, format="json")

        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_password(self, api_client):
        res = api_client.post(
            REGISTER_URL, {"username": "user", "email": "a@b.com"}, format="json"
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_short_password(self, api_client):
        res = api_client.post(
            REGISTER_URL,
            {"username": "user", "email": "a@b.com", "password": "short"},
            format="json",
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_email(self, api_client):
        res = api_client.post(
            REGISTER_URL, {"username": "user", "password": "pass1234"}, format="json"
        )
        assert res.status_code == status.HTTP_400_BAD_REQUEST


# ------------------------------------------------------------------
# ログイン
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestLogin:
    def test_success(self, api_client, user_payload):
        User.objects.create_user(**user_payload)
        res = api_client.post(
            LOGIN_URL,
            {"username": user_payload["username"], "password": user_payload["password"]},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        assert "access_token" in res.cookies
        assert "refresh_token" in res.cookies

    def test_wrong_password(self, api_client, user_payload):
        User.objects.create_user(**user_payload)
        res = api_client.post(
            LOGIN_URL,
            {"username": user_payload["username"], "password": "wrongpassword"},
            format="json",
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_nonexistent_user(self, api_client):
        res = api_client.post(
            LOGIN_URL, {"username": "ghost", "password": "doesnotexist"}, format="json"
        )
        assert res.status_code == status.HTTP_401_UNAUTHORIZED


# ------------------------------------------------------------------
# ログアウト
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestLogout:
    def test_success(self, api_client, user_payload):
        # 登録してログイン状態（Cookie セット済み）にする
        api_client.post(REGISTER_URL, user_payload, format="json")

        res = api_client.post(LOGOUT_URL)

        assert res.status_code == status.HTTP_204_NO_CONTENT

    def test_requires_auth(self, api_client):
        res = api_client.post(LOGOUT_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_cookies_cleared_after_logout(self, api_client, user_payload):
        api_client.post(REGISTER_URL, user_payload, format="json")
        res = api_client.post(LOGOUT_URL)
        # Set-Cookie で max-age=0 または空値がセットされていることを確認
        assert res.cookies["access_token"].value == ""
        assert res.cookies["refresh_token"].value == ""


# ------------------------------------------------------------------
# トークンリフレッシュ
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestTokenRefresh:
    def test_success(self, api_client, user_payload):
        api_client.post(REGISTER_URL, user_payload, format="json")

        res = api_client.post(REFRESH_URL)

        assert res.status_code == status.HTTP_200_OK
        # rotation で新しいトークンペアが Cookie にセットされる
        assert "access_token" in res.cookies
        assert "refresh_token" in res.cookies

    def test_without_cookie(self, api_client):
        # Cookie なし → 401
        res = api_client.post(REFRESH_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rotation_invalidates_old_token(self, api_client, user_payload):
        api_client.post(REGISTER_URL, user_payload, format="json")

        # リフレッシュ前の refresh_token を保存
        old_refresh = api_client.cookies["refresh_token"].value

        # 1回目のリフレッシュ（rotation で新しいトークンが発行され、古いトークンはブラックリスト登録）
        api_client.post(REFRESH_URL)

        # 古い refresh_token を強制セットして再利用を試みる → 401
        api_client.cookies["refresh_token"] = old_refresh
        res = api_client.post(REFRESH_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED
