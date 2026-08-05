"""Google / GitHub ログインの中身。

ビューに残すのは「認証ページへ飛ばす」「戻ってきたら Cookie を張る」だけで、
提供元ごとの差（トークンの取り方・利用者情報の形）はここに閉じ込める。

## state と nonce（ログイン CSRF 対策）

以前は `request.session` に state を入れて照合していたが、フロント(Vercel)／
バックエンド(Render)＋Next proxy の構成ではセッションの共有が不安定で、
Google/GitHub ログインが「たまに失敗」していた。そこで:

  - state = 署名付き（改ざん検知＋有効期限）で next パスと nonce を内包する文字列
  - nonce は短命 Cookie（フロントドメインで発行）にも入れ、コールバックで二重照合する

これでサーバーセッションに依存せずログイン CSRF を防げる。
"""

import secrets
import urllib.parse

import requests as http_requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.http import HttpResponseRedirect

User = get_user_model()

NONCE_COOKIE = "oauth_nonce"
_STATE_SALT = "oauth-state"
_STATE_MAX_AGE = 600  # 秒（10分）

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

_GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
_GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
_GITHUB_USERINFO_URL = "https://api.github.com/user"
_GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

_HTTP_TIMEOUT = 10


def safe_next_path(raw: str | None) -> str:
    """ログイン後の戻り先を相対パスだけに限る（open redirect 対策）。

    フロントの safeRedirectTarget と同じガード:
    - "/" で始まり、かつ "//"（プロトコル相対 URL）で始まらないものだけ許可
    - 不正なら空文字を返し、呼び出し側で FRONTEND_URL のルートに飛ばす
    """
    if raw and raw.startswith("/") and not raw.startswith("//"):
        return raw
    return ""


def make_state(next_path: str) -> tuple[str, str]:
    """(署名付き state, nonce) を返す。state は URL に載せ、nonce は Cookie に入れる。"""
    nonce = secrets.token_urlsafe(24)
    state = signing.dumps({"nonce": nonce, "next": next_path}, salt=_STATE_SALT)
    return state, nonce


def set_nonce_cookie(response, nonce: str) -> None:
    response.set_cookie(
        NONCE_COOKIE,
        nonce,
        max_age=_STATE_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
    )


def verify_state(request) -> str:
    """state の署名・有効期限・nonce Cookie 一致を検証し、next パスを返す。

    不正なら signing.BadSignature を送出する（呼び出し側で error リダイレクト）。
    """
    state = request.GET.get("state")
    cookie_nonce = request.COOKIES.get(NONCE_COOKIE)
    if not state or not cookie_nonce:
        raise signing.BadSignature("missing state or nonce cookie")

    data = signing.loads(state, salt=_STATE_SALT, max_age=_STATE_MAX_AGE)
    if not secrets.compare_digest(str(data.get("nonce", "")), cookie_nonce):
        raise signing.BadSignature("nonce mismatch")
    return safe_next_path(data.get("next"))


def error_redirect() -> HttpResponseRedirect:
    return HttpResponseRedirect(f"{settings.FRONTEND_URL}/login?oauth=error")


def success_redirect(next_path: str) -> HttpResponseRedirect:
    target = (
        f"{settings.FRONTEND_URL}{next_path}?oauth=success"
        if next_path
        else f"{settings.FRONTEND_URL}?oauth=success"
    )
    return HttpResponseRedirect(target)


# ---------------------------------------------------------------------------
# 認証ページの URL
# ---------------------------------------------------------------------------


def google_authorize_url(state: str) -> str:
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
    }
    return f"{_GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"


def github_authorize_url(state: str) -> str:
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "read:user user:email",
        "state": state,
    }
    return f"{_GITHUB_AUTH_URL}?{urllib.parse.urlencode(params)}"


# ---------------------------------------------------------------------------
# 提供元から利用者情報を取る
#
# どちらも (provider_uid, email, name) を返す。取れなければ None を返し、
# 呼び出し側は error_redirect() へ倒す。例外は投げない——OAuth の失敗は
# 相手側の都合でも起きるので、利用者にはログイン画面へ戻ってもらう。
# ---------------------------------------------------------------------------


def fetch_google_identity(code: str) -> tuple[str, str | None, str | None] | None:
    token_resp = http_requests.post(
        _GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=_HTTP_TIMEOUT,
    )
    if not token_resp.ok:
        return None

    access_token = token_resp.json().get("access_token")
    userinfo_resp = http_requests.get(
        _GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=_HTTP_TIMEOUT,
    )
    if not userinfo_resp.ok:
        return None

    info = userinfo_resp.json()
    return info["sub"], info.get("email"), info.get("name")


def fetch_github_identity(code: str) -> tuple[str, str | None, str | None] | None:
    token_resp = http_requests.post(
        _GITHUB_TOKEN_URL,
        data={
            "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
        },
        headers={"Accept": "application/json"},
        timeout=_HTTP_TIMEOUT,
    )
    if not token_resp.ok:
        return None

    headers = {
        "Authorization": f"Bearer {token_resp.json().get('access_token')}",
        "Accept": "application/vnd.github+json",
    }
    userinfo_resp = http_requests.get(_GITHUB_USERINFO_URL, headers=headers, timeout=_HTTP_TIMEOUT)
    if not userinfo_resp.ok:
        return None

    info = userinfo_resp.json()
    email = info.get("email") or _github_primary_email(headers)
    return str(info["id"]), email, info.get("login")


def _github_primary_email(headers: dict) -> str | None:
    """GitHub でメールを非公開にしている人のために、emails API から主アドレスを引く。"""
    resp = http_requests.get(_GITHUB_EMAILS_URL, headers=headers, timeout=_HTTP_TIMEOUT)
    if not resp.ok:
        return None
    return next(
        (e["email"] for e in resp.json() if e.get("primary") and e.get("verified")),
        None,
    )


# ---------------------------------------------------------------------------
# 利用者の引き当て
# ---------------------------------------------------------------------------


def get_or_create_social_user(
    provider: str, provider_uid: str, email: str | None, name: str | None
):
    """外部アカウントに対応する利用者を返す。無ければ作る。

    引き当ての順番:
      1. 同じ (provider, provider_uid) の連携が既にある
      2. メールが一致する既存の利用者に連携を足す
      3. どちらも無ければ新しく作る（パスワード無し＝外部ログイン専用）
    """
    from .models import SocialAccount

    try:
        return (
            SocialAccount.objects.select_related("user")
            .get(provider=provider, provider_uid=provider_uid)
            .user
        )
    except SocialAccount.DoesNotExist:
        pass

    user = User.objects.filter(email=email).first() if email else None
    if user is None:
        user = User.objects.create_user(
            username=_available_username(provider, provider_uid, name),
            email=email or "",
            password=None,
        )

    SocialAccount.objects.create(provider=provider, provider_uid=provider_uid, user=user)
    return user


def _available_username(provider: str, provider_uid: str, name: str | None) -> str:
    """表示名から使える利用者名を作る。埋まっていたら連番を足す。"""
    base = (name or provider_uid)[:30].lower().replace(" ", "_")
    base = "".join(c for c in base if c.isalnum() or c == "_") or f"{provider}_user"
    username, suffix = base, 1
    while User.objects.filter(username=username).exists():
        username = f"{base}_{suffix}"
        suffix += 1
    return username
