import pytest
from rest_framework import status

REGISTER_URL = "/api/auth/register/"
LOGIN_URL = "/api/auth/login/"
LOGOUT_URL = "/api/auth/logout/"
REFRESH_URL = "/api/auth/token/refresh/"
ME_URL = "/api/auth/me/"


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
        from django.contrib.auth import get_user_model
        get_user_model().objects.create_user(**user_payload)
        res = api_client.post(
            LOGIN_URL,
            {"username": user_payload["username"], "password": user_payload["password"]},
            format="json",
        )

        assert res.status_code == status.HTTP_200_OK
        assert "access_token" in res.cookies
        assert "refresh_token" in res.cookies

    def test_wrong_password(self, api_client, user_payload):
        from django.contrib.auth import get_user_model
        get_user_model().objects.create_user(**user_payload)
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

    def test_without_cookie_clears_state(self, api_client):
        # Cookie が無くてもログアウトは 204 で成立する（アクセストークン期限切れ救済）。
        # Cookie が無いので blacklist 対象もなく、Set-Cookie で削除指示だけ返る。
        res = api_client.post(LOGOUT_URL)
        assert res.status_code == status.HTTP_204_NO_CONTENT
        assert res.cookies["access_token"].value == ""
        assert res.cookies["refresh_token"].value == ""

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


# ------------------------------------------------------------------
# 自分の情報取得
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestMe:
    def test_get_returns_current_user(self, auth_client, user_payload):
        res = auth_client.get(ME_URL)

        assert res.status_code == status.HTTP_200_OK
        assert res.data["username"] == user_payload["username"]
        assert res.data["email"] == user_payload["email"]
        assert "bio" in res.data

    def test_requires_auth(self, api_client):
        res = api_client.get(ME_URL)
        assert res.status_code == status.HTTP_401_UNAUTHORIZED


# ------------------------------------------------------------------
# プロフィール更新
# ------------------------------------------------------------------
@pytest.mark.django_db
class TestProfileUpdate:
    def test_update_bio(self, auth_client):
        res = auth_client.patch(ME_URL, {"bio": "テスト自己紹介"}, format="json")

        assert res.status_code == status.HTTP_200_OK
        assert res.data["bio"] == "テスト自己紹介"

    def test_update_bio_to_empty(self, auth_client):
        auth_client.patch(ME_URL, {"bio": "初期テキスト"}, format="json")
        res = auth_client.patch(ME_URL, {"bio": ""}, format="json")

        assert res.status_code == status.HTTP_200_OK
        assert res.data["bio"] == ""

    def test_requires_auth(self, api_client):
        res = api_client.patch(ME_URL, {"bio": "test"}, format="json")
        assert res.status_code == status.HTTP_401_UNAUTHORIZED

    def test_username_is_not_updated(self, auth_client, user_payload):
        # username フィールドを送信しても bio のみ更新される
        res = auth_client.patch(ME_URL, {"username": "hacked", "bio": "テスト"}, format="json")

        assert res.status_code == status.HTTP_200_OK
        assert res.data["username"] == user_payload["username"]
        assert res.data["bio"] == "テスト"
