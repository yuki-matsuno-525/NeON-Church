"""
セキュリティ関連テスト。

- _mask() ログマスキング関数の単体テスト
- 登録・ログインレスポンスの Cookie 属性（HttpOnly / SameSite）検証
- 非アクティブユーザーがコメント投稿できないことの確認
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from common.logging import _mask
from tests.conftest import REGISTER_URL

User = get_user_model()

COMMENTS_URL = "/api/comments/"
LOGIN_URL = "/api/auth/login/"


# ===================================================================
# _mask() ユニットテスト
# ===================================================================

class TestMask:
    def test_masks_password_field(self):
        result = _mask('{"username": "alice", "password": "supersecret"}')
        assert "supersecret" not in result
        assert '"password": "***"' in result

    def test_masks_token_field(self):
        result = _mask('{"token": "abc.def.ghi"}')
        assert "abc.def.ghi" not in result
        assert '"token": "***"' in result

    def test_masks_access_field(self):
        result = _mask('{"access": "eyJ0eXAiOiJKV1QifQ"}')
        assert "eyJ0eXAiOiJKV1QifQ" not in result

    def test_masks_refresh_field(self):
        result = _mask('{"refresh": "some_refresh_token"}')
        assert "some_refresh_token" not in result

    def test_masks_authorization_header(self):
        result = _mask("Authorization: Bearer eyJtokenvalue")
        assert "eyJtokenvalue" not in result
        assert "Authorization: Bearer ***" in result

    def test_masks_cookie_header(self):
        result = _mask("Cookie: access_token=abc; refresh_token=xyz")
        assert "abc" not in result
        assert "xyz" not in result
        assert "Cookie: ***" in result

    def test_masks_email_address(self):
        result = _mask("User email: alice@example.com registered")
        assert "alice@example.com" not in result
        assert "***@***.***" in result

    def test_preserves_unmasked_content(self):
        text = '{"username": "alice", "body": "hello world"}'
        result = _mask(text)
        assert "alice" in result
        assert "hello world" in result

    def test_case_insensitive_password(self):
        result = _mask('{"Password": "secret123"}')
        assert "secret123" not in result

    def test_empty_string(self):
        assert _mask("") == ""


# ===================================================================
# Cookie 属性テスト
# ===================================================================

@pytest.mark.django_db
class TestCookieAttributes:
    def test_register_sets_httponly_cookies(self, api_client, user_payload):
        """登録レスポンスの access_token / refresh_token が HttpOnly。"""
        res = api_client.post(REGISTER_URL, user_payload, format="json")

        assert res.status_code == status.HTTP_201_CREATED
        assert res.cookies["access_token"]["httponly"]
        assert res.cookies["refresh_token"]["httponly"]

    def test_register_sets_samesite_lax(self, api_client, user_payload):
        """登録レスポンスの Cookie が SameSite=Lax。"""
        res = api_client.post(REGISTER_URL, user_payload, format="json")

        assert res.cookies["access_token"]["samesite"].lower() == "lax"
        assert res.cookies["refresh_token"]["samesite"].lower() == "lax"

    def test_login_sets_httponly_cookies(self, api_client, user_payload):
        """ログインレスポンスの Cookie が HttpOnly。"""
        api_client.post(REGISTER_URL, user_payload, format="json")
        fresh = APIClient()
        res = fresh.post(LOGIN_URL, {
            "username": user_payload["username"],
            "password": user_payload["password"],
        }, format="json")

        assert res.status_code == status.HTTP_200_OK
        assert res.cookies["access_token"]["httponly"]
        assert res.cookies["refresh_token"]["httponly"]

    def test_response_body_contains_no_tokens(self, api_client, user_payload):
        """レスポンス JSON にトークン文字列が含まれない（Cookie 専用）。"""
        res = api_client.post(REGISTER_URL, user_payload, format="json")

        assert "access" not in res.data
        assert "refresh" not in res.data
        assert "token" not in res.data


# ===================================================================
# 非アクティブユーザーの認証ブロック
# ===================================================================

@pytest.mark.django_db
class TestInactiveUserBlocked:
    def test_inactive_user_cannot_login(self, api_client, user_payload):
        """is_active=False のユーザーはログインできない。"""
        User.objects.create_user(**user_payload, is_active=False)

        res = api_client.post(LOGIN_URL, {
            "username": user_payload["username"],
            "password": user_payload["password"],
        }, format="json")

        assert res.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_anonymous_cannot_post_comment(self, api_client, verse):
        """未認証ユーザーはコメント投稿できない。"""
        res = api_client.post(
            COMMENTS_URL,
            {"verse": str(verse.id), "body": "投稿テスト"},
            format="json",
        )

        assert res.status_code == status.HTTP_401_UNAUTHORIZED
