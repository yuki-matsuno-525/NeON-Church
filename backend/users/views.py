import secrets
import urllib.parse

import requests as http_requests
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.http import HttpResponseRedirect
from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, NotFound
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from common.pagination import StandardPageNumberPagination

from .serializers import LoginSerializer, ProfileUpdateSerializer, PublicUserSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


def _safe_next_path(raw: str | None) -> str:
    """OAuth コールバック後のリダイレクト先を相対パスのみに限定する（open redirect 対策）。

    フロントの safeRedirectTarget と同じガード:
    - "/" で始まり、かつ "//"（プロトコル相対 URL）で始まらないものだけ許可
    - 不正なら空文字を返し、呼び出し側で FRONTEND_URL のルートに飛ばす
    """
    if raw and raw.startswith("/") and not raw.startswith("//"):
        return raw
    return ""


def _set_auth_cookies(response, access: str, refresh: str | None = None) -> None:
    """
    access_token と refresh_token を HTTP-only Cookie にセットする。
    secure フラグは本番（DEBUG=False）のみ有効にする。
    """
    jwt_settings = settings.SIMPLE_JWT
    response.set_cookie(
        "access_token",
        access,
        max_age=int(jwt_settings["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
    )
    if refresh is not None:
        response.set_cookie(
            "refresh_token",
            refresh,
            max_age=int(jwt_settings["REFRESH_TOKEN_LIFETIME"].total_seconds()),
            httponly=True,
            secure=not settings.DEBUG,
            samesite="Lax",
        )


class RegisterView(APIView):
    """
    ユーザー登録。
    成功するとトークンを HTTP-only Cookie にセットしてログイン状態で返す。
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        response = Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class LoginView(APIView):
    """
    ログイン。username + password を検証し、成功したらトークンを Cookie にセットする。
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            raise AuthenticationFailed("Invalid username or password.")

        refresh = RefreshToken.for_user(user)
        response = Response(UserSerializer(user).data)
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class LogoutView(APIView):
    """
    ログアウト。Cookie の refresh_token をブラックリストに追加し、両方の Cookie を削除する。

    アクセストークン期限切れ時にもログアウトを成立させたいため AllowAny にしている。
    refresh_token が無ければ blacklist をスキップして Cookie 削除のみ行う。
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        raw_refresh = request.COOKIES.get("refresh_token")
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except (TokenError, AttributeError):
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        # set_cookie 時と同じパラメータで期限切れにすることで確実に削除する
        for name in ("access_token", "refresh_token"):
            response.set_cookie(
                name,
                "",
                max_age=0,
                httponly=True,
                secure=not settings.DEBUG,
                samesite="Lax",
                expires="Thu, 01 Jan 1970 00:00:00 GMT",
            )
        return response


class MeView(APIView):
    """GET /api/auth/me/  現在のログインユーザー情報を返す。PATCH でプロフィール更新。"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)

    def patch(self, request: Request) -> Response:
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


class UserProfileView(APIView):
    """GET /api/users/<username>/  公開プロフィール（認証不要）"""

    permission_classes = [AllowAny]

    def get(self, request: Request, username: str) -> Response:
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise NotFound("User not found.")
        return Response(PublicUserSerializer(user, context={"request": request}).data)


class UserCommentsView(generics.ListAPIView):
    """GET /api/users/<username>/comments/  ユーザーのコメント一覧（認証不要）"""

    permission_classes = [AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        from comments.serializers import CommentSerializer
        return CommentSerializer

    def get_queryset(self):
        from django.db.models import Count
        from comments.models import Comment
        username = self.kwargs["username"]
        if not User.objects.filter(username=username).exists():
            raise NotFound("User not found.")
        return (
            Comment.objects.filter(user__username=username, is_deleted=False, parent=None)
            .select_related("user")
            .prefetch_related("tags")
            .annotate(vote_count=Count("votes"))
            .order_by("-created_at")
        )


class UserBookmarksView(generics.ListAPIView):
    """GET /api/users/<username>/bookmarks/  ユーザーのお気に入り一覧（認証不要）

    対象ユーザーの bookmarks_visibility が "public" のときのみ実データを返す。
    "private"（既定）のときは空配列を返す。フロントエンドは公開プロフィールの
    visibility を見てタブ表示自体を出し分ける。
    """

    permission_classes = [AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        from bookmarks.serializers import BookmarkSerializer
        return BookmarkSerializer

    def get_queryset(self):
        from bookmarks.models import Bookmark
        username = self.kwargs["username"]
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise NotFound("User not found.")
        if user.bookmarks_visibility != User.BOOKMARKS_PUBLIC:
            return Bookmark.objects.none()
        return (
            Bookmark.objects.filter(user=user)
            .select_related("verse__chapter__book", "comment__user")
        )


class TokenRefreshView(APIView):
    """
    アクセストークンのリフレッシュ。
    Cookie の refresh_token を使い、新しいトークンペアを発行する（rotation あり）。
    古い refresh_token はブラックリストに追加される。
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        raw_refresh = request.COOKIES.get("refresh_token")
        if not raw_refresh:
            raise NotAuthenticated("refresh_token cookie not found.")

        try:
            refresh = RefreshToken(raw_refresh)
            access = str(refresh.access_token)

            # 古い refresh token をブラックリストに追加し、新しい jti/exp/iat を付与する
            try:
                refresh.blacklist()
            except AttributeError:
                pass
            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()

            response = Response({"detail": "Token refreshed."})
            _set_auth_cookies(response, access, str(refresh))
            return response

        except TokenError:
            # 詳細はログ / Sentry に上がっており、クライアントには汎用文言だけ返す
            raise AuthenticationFailed("Invalid refresh token.")


# ---------------------------------------------------------------------------
# OAuth ヘルパー
# ---------------------------------------------------------------------------

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

_GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
_GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
_GITHUB_USERINFO_URL = "https://api.github.com/user"
_GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


def _get_or_create_social_user(provider: str, provider_uid: str, email: str | None, name: str | None) -> "User":
    """SocialAccount からユーザーを取得または新規作成する。"""
    from .models import SocialAccount

    try:
        return SocialAccount.objects.select_related("user").get(
            provider=provider, provider_uid=provider_uid
        ).user
    except SocialAccount.DoesNotExist:
        pass

    # メールが一致する既存ユーザーと連携
    user = User.objects.filter(email=email).first() if email else None

    if user is None:
        base = (name or provider_uid)[:30].lower().replace(" ", "_")
        base = "".join(c for c in base if c.isalnum() or c == "_") or f"{provider}_user"
        username, suffix = base, 1
        while User.objects.filter(username=username).exists():
            username = f"{base}_{suffix}"
            suffix += 1
        user = User.objects.create_user(username=username, email=email or "", password=None)

    SocialAccount.objects.create(provider=provider, provider_uid=provider_uid, user=user)
    return user


def _oauth_error_redirect() -> HttpResponseRedirect:
    return HttpResponseRedirect(f"{settings.FRONTEND_URL}/login?oauth=error")


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

class GoogleOAuthView(APIView):
    """GET /api/auth/oauth/google/ → Google 認証ページへリダイレクト"""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> HttpResponseRedirect:
        state = secrets.token_urlsafe(32)
        request.session["oauth_state"] = state
        request.session["oauth_next"] = _safe_next_path(request.GET.get("next"))

        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
        }
        return HttpResponseRedirect(f"{_GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}")


class GoogleCallbackView(APIView):
    """GET /api/auth/oauth/google/callback/ → JWT Cookie 設定 → フロントへリダイレクト"""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> HttpResponseRedirect:
        code = request.GET.get("code")
        state = request.GET.get("state")
        if not code or state != request.session.get("oauth_state"):
            return _oauth_error_redirect()

        next_path = _safe_next_path(request.session.get("oauth_next"))

        token_resp = http_requests.post(_GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }, timeout=10)
        if not token_resp.ok:
            return _oauth_error_redirect()

        access_token = token_resp.json().get("access_token")
        userinfo_resp = http_requests.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if not userinfo_resp.ok:
            return _oauth_error_redirect()

        info = userinfo_resp.json()
        user = _get_or_create_social_user("google", info["sub"], info.get("email"), info.get("name"))

        redirect_to = f"{settings.FRONTEND_URL}{next_path}?oauth=success" if next_path else f"{settings.FRONTEND_URL}?oauth=success"
        response = HttpResponseRedirect(redirect_to)
        refresh = RefreshToken.for_user(user)
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


# ---------------------------------------------------------------------------
# GitHub OAuth
# ---------------------------------------------------------------------------

class GithubOAuthView(APIView):
    """GET /api/auth/oauth/github/ → GitHub 認証ページへリダイレクト"""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> HttpResponseRedirect:
        state = secrets.token_urlsafe(32)
        request.session["oauth_state"] = state
        request.session["oauth_next"] = _safe_next_path(request.GET.get("next"))

        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "read:user user:email",
            "state": state,
        }
        return HttpResponseRedirect(f"{_GITHUB_AUTH_URL}?{urllib.parse.urlencode(params)}")


class GithubCallbackView(APIView):
    """GET /api/auth/oauth/github/callback/ → JWT Cookie 設定 → フロントへリダイレクト"""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> HttpResponseRedirect:
        code = request.GET.get("code")
        state = request.GET.get("state")
        if not code or state != request.session.get("oauth_state"):
            return _oauth_error_redirect()

        next_path = _safe_next_path(request.session.get("oauth_next"))

        token_resp = http_requests.post(
            _GITHUB_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )
        if not token_resp.ok:
            return _oauth_error_redirect()

        gh_token = token_resp.json().get("access_token")
        gh_headers = {"Authorization": f"Bearer {gh_token}", "Accept": "application/vnd.github+json"}

        userinfo_resp = http_requests.get(_GITHUB_USERINFO_URL, headers=gh_headers, timeout=10)
        if not userinfo_resp.ok:
            return _oauth_error_redirect()

        info = userinfo_resp.json()
        provider_uid = str(info["id"])
        email = info.get("email")

        # email が非公開の場合は emails API から取得
        if not email:
            emails_resp = http_requests.get(_GITHUB_EMAILS_URL, headers=gh_headers, timeout=10)
            if emails_resp.ok:
                primary = next(
                    (e["email"] for e in emails_resp.json() if e.get("primary") and e.get("verified")),
                    None,
                )
                email = primary

        user = _get_or_create_social_user("github", provider_uid, email, info.get("login"))

        redirect_to = f"{settings.FRONTEND_URL}{next_path}?oauth=success" if next_path else f"{settings.FRONTEND_URL}?oauth=success"
        response = HttpResponseRedirect(redirect_to)
        refresh = RefreshToken.for_user(user)
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response
