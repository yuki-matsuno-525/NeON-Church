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
    mock_get.return_value = _resp_ok({"sub": "g-1", "email": "a@example.com", "email_verified": True, "name": "Alice"})

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


# ---------------------------------------------------------------------------
# 既存アカウントへのつなぎ込み（他人のメールで先に登録しておく乗っ取りを防ぐ）
# ---------------------------------------------------------------------------


def _google_login(api, mock_post, mock_get, userinfo: dict):
    state, nonce = user_views._make_oauth_state("")
    api.cookies[NONCE_COOKIE] = nonce
    mock_post.return_value = _resp_ok({"access_token": "tok"})
    mock_get.return_value = _resp_ok(userinfo)
    return api.get(GOOGLE_CB, {"code": "abc", "state": state})


@patch("users.views.http_requests.get")
@patch("users.views.http_requests.post")
def test_verified_email_does_not_link_to_password_account(mock_post, mock_get, api, django_user_model):
    squatter = django_user_model.objects.create_user(username="squatter", email="victim@example.com", password="pw-123456!")

    res = _google_login(api, mock_post, mock_get, {"sub": "g-v", "email": "victim@example.com", "email_verified": True, "name": "Victim"})

    assert "oauth=email_taken" in res["Location"]
    assert "access_token" not in res.cookies
    from users.models import SocialAccount
    assert not SocialAccount.objects.filter(user=squatter).exists()


@patch("users.views.http_requests.get")
@patch("users.views.http_requests.post")
def test_unverified_email_is_neither_linked_nor_saved(mock_post, mock_get, api, django_user_model):
    social_only = django_user_model.objects.create_user(username="gh_user", email="x@example.com", password=None)

    res = _google_login(api, mock_post, mock_get, {"sub": "g-u", "email": "x@example.com", "email_verified": False, "name": "X"})

    assert "oauth=success" in res["Location"]
    from users.models import SocialAccount
    new_user = SocialAccount.objects.get(provider="google", provider_uid="g-u").user
    assert new_user != social_only
    assert new_user.email == ""


@patch("users.views.http_requests.get")
@patch("users.views.http_requests.post")
def test_verified_email_links_to_social_only_account(mock_post, mock_get, api, django_user_model):
    social_only = django_user_model.objects.create_user(username="gh_user", email="y@example.com", password=None)

    res = _google_login(api, mock_post, mock_get, {"sub": "g-y", "email": "y@example.com", "email_verified": True, "name": "Y"})

    assert "oauth=success" in res["Location"]
    from users.models import SocialAccount
    assert SocialAccount.objects.get(provider="google", provider_uid="g-y").user == social_only


@patch("users.views.http_requests.get")
@patch("users.views.http_requests.post")
def test_inactive_user_cannot_login_with_google(mock_post, mock_get, api, django_user_model):
    user = django_user_model.objects.create_user(username="banned", email="b@example.com", password=None, is_active=False)
    from users.models import SocialAccount
    SocialAccount.objects.create(provider="google", provider_uid="g-b", user=user)

    res = _google_login(api, mock_post, mock_get, {"sub": "g-b", "email": "b@example.com", "email_verified": True, "name": "B"})

    assert "oauth=error" in res["Location"]
    assert "access_token" not in res.cookies
