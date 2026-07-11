"""OAuth（Google/GitHub）の state 検証テスト（B-2: セッション非依存の署名 state＋nonce Cookie）。

外部プロバイダー（token / userinfo）呼び出しは mock する。
"""

from unittest.mock import Mock, patch

import pytest
from rest_framework.test import APIClient

from users import views as user_views

pytestmark = pytest.mark.django_db

GOOGLE_ENTRY = "/api/auth/oauth/google/"
GOOGLE_CB = "/api/auth/oauth/google/callback/"
NONCE_COOKIE = "oauth_nonce"


@pytest.fixture
def api():
    return APIClient()


def _resp_ok(body: dict) -> Mock:
    m = Mock()
    m.ok = True
    m.json.return_value = body
    return m


def test_entry_sets_signed_state_and_nonce_cookie(api):
    res = api.get(GOOGLE_ENTRY, {"next": "/bookmarks"})

    assert res.status_code == 302
    assert "accounts.google.com" in res["Location"]
    assert "state=" in res["Location"]
    # nonce Cookie が発行される
    assert NONCE_COOKIE in res.cookies
    assert res.cookies[NONCE_COOKIE].value


@patch("users.views.http_requests.get")
@patch("users.views.http_requests.post")
def test_callback_success_creates_user_and_sets_jwt(mock_post, mock_get, api):
    state, nonce = user_views._make_oauth_state("/bookmarks")
    api.cookies[NONCE_COOKIE] = nonce
    mock_post.return_value = _resp_ok({"access_token": "tok"})
    mock_get.return_value = _resp_ok({"sub": "g-1", "email": "a@example.com", "name": "Alice"})

    res = api.get(GOOGLE_CB, {"code": "abc", "state": state})

    assert res.status_code == 302
    assert "oauth=success" in res["Location"]
    assert "/bookmarks" in res["Location"]
    assert "access_token" in res.cookies
    assert "refresh_token" in res.cookies
    # 使用後 nonce Cookie は削除される
    assert res.cookies[NONCE_COOKIE].value == ""
    from users.models import SocialAccount
    assert SocialAccount.objects.filter(provider="google", provider_uid="g-1").exists()


@patch("users.views.http_requests.post")
def test_callback_nonce_mismatch_errors_before_external_call(mock_post, api):
    state, _nonce = user_views._make_oauth_state("")
    api.cookies[NONCE_COOKIE] = "WRONG"

    res = api.get(GOOGLE_CB, {"code": "abc", "state": state})

    assert res.status_code == 302
    assert "oauth=error" in res["Location"]
    mock_post.assert_not_called()  # 検証前に外部 API を叩かない


def test_callback_missing_nonce_cookie_errors(api):
    state, _nonce = user_views._make_oauth_state("")
    # Cookie を付けない
    res = api.get(GOOGLE_CB, {"code": "abc", "state": state})
    assert "oauth=error" in res["Location"]


def test_callback_tampered_state_errors(api):
    api.cookies[NONCE_COOKIE] = "somenonce"
    res = api.get(GOOGLE_CB, {"code": "abc", "state": "tampered.value"})
    assert "oauth=error" in res["Location"]


def test_callback_without_code_errors(api):
    state, nonce = user_views._make_oauth_state("")
    api.cookies[NONCE_COOKIE] = nonce
    res = api.get(GOOGLE_CB, {"state": state})  # code なし
    assert "oauth=error" in res["Location"]
