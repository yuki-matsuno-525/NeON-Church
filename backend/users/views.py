import logging
import secrets
import urllib.parse

import requests as http_requests
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated, NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from common.pagination import StandardPageNumberPagination

from .serializers import (
    AccountDeletionSerializer,
    AccountSettingsSerializer,
    IdentityUpdateSerializer,
    LoginSerializer,
    NotificationPreferencesSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


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


def _clear_auth_cookies(response) -> None:
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


def _blacklist_user_sessions(user, *, except_jti: str | None = None) -> None:
    tokens = OutstandingToken.objects.filter(
        user=user,
        expires_at__gt=timezone.now(),
        blacklistedtoken__isnull=True,
    )
    if except_jti:
        tokens = tokens.exclude(jti=except_jti)
    for token in tokens:
        BlacklistedToken.objects.get_or_create(token=token)


def _current_refresh_jti(request: Request) -> str | None:
    raw_refresh = request.COOKIES.get("refresh_token")
    if not raw_refresh:
        return None
    try:
        return str(RefreshToken(raw_refresh)["jti"])
    except (TokenError, KeyError):
        return None


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
            Comment.objects.filter(user__username=username, is_deleted=False, parent=None, translation_project__isnull=True)
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

    def get_base_queryset(self):
        """絞り込み前の対象ユーザーの栞。非公開なら空。件数集計にも使う。"""
        from bookmarks.models import Bookmark
        from bookmarks.views import filter_by_translation_visibility

        username = self.kwargs["username"]
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise NotFound("User not found.")
        if user.bookmarks_visibility != User.BOOKMARKS_PUBLIC:
            return Bookmark.objects.none()

        return filter_by_translation_visibility(Bookmark.objects.filter(user=user), self.request.user)

    def get_queryset(self):
        # 自分の /bookmarks と同じ形（種類での絞り込み・節本文つき）で返す。
        # 表示側のカードを共通化しているため、ここだけ形が違うと本文が出ない。
        from bookmarks.filters import filter_by_type
        from bookmarks.views import annotate_verse_text

        qs = self.get_base_queryset().select_related(
            "canonical_book", "comment__user", "comment__canonical_book",
            "translation_project",
        )
        qs = filter_by_type(qs, self.request.query_params.get("type"))
        return annotate_verse_text(qs)

    def list(self, request, *args, **kwargs):
        from bookmarks.filters import count_by_type

        response = super().list(request, *args, **kwargs)
        response.data["counts"] = count_by_type(self.get_base_queryset())
        return response


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

            # 古い refresh token をブラックリストに追加し、新しい jti/exp/iat を付与する
            try:
                refresh.blacklist()
            except AttributeError:
                pass
            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()
            refresh.outstand()
            access = str(refresh.access_token)

            response = Response({"detail": "Token refreshed."})
            _set_auth_cookies(response, access, str(refresh))
            return response

        except TokenError:
            # 詳細はログ / Sentry に上がっており、クライアントには汎用文言だけ返す
            raise AuthenticationFailed("Invalid refresh token.")


# ---------------------------------------------------------------------------
# OAuth ヘルパー
# ---------------------------------------------------------------------------

class AccountSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(AccountSettingsSerializer(request.user).data)


class IdentityUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request: Request) -> Response:
        serializer = IdentityUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AccountSettingsSerializer(user).data)


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request: Request) -> Response:
        serializer = NotificationPreferencesSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        _blacklist_user_sessions(user)

        refresh = RefreshToken.for_user(user)
        response = Response({"detail": "Password changed."})
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class SessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        current_jti = _current_refresh_jti(request)
        tokens = OutstandingToken.objects.filter(
            user=request.user,
            expires_at__gt=timezone.now(),
            blacklistedtoken__isnull=True,
        ).order_by("-created_at")
        return Response([
            {
                "id": token.jti,
                "created_at": token.created_at,
                "expires_at": token.expires_at,
                "current": token.jti == current_jti,
            }
            for token in tokens
        ])


class SessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request, jti: str) -> Response:
        try:
            token = OutstandingToken.objects.get(
                user=request.user,
                jti=jti,
                expires_at__gt=timezone.now(),
            )
        except OutstandingToken.DoesNotExist:
            raise NotFound("Session not found.")
        BlacklistedToken.objects.get_or_create(token=token)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        if jti == _current_refresh_jti(request):
            _clear_auth_cookies(response)
        return response


class RevokeOtherSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        _blacklist_user_sessions(request.user, except_jti=_current_refresh_jti(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccountDeletionView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request: Request) -> Response:
        serializer = AccountDeletionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        _blacklist_user_sessions(user)
        user.delete()
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_auth_cookies(response)
        return response


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(
            email__iexact=serializer.validated_data["email"],
            is_active=True,
        ).first()
        if user and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            query = urllib.parse.urlencode({"uid": uid, "token": token})
            reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?{query}"
            try:
                send_mail(
                    "NeON Church password reset",
                    f"Use the following link to reset your password:\n\n{reset_url}",
                    getattr(settings, "DEFAULT_FROM_EMAIL", None),
                    [user.email],
                    fail_silently=True,
                )
            except Exception:
                logger.exception("Password reset email delivery failed")
        return Response(
            {"detail": "If an account exists for that email address, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user_id = force_str(urlsafe_base64_decode(serializer.validated_data["uid"]))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise ValidationError({"token": "This password reset link is invalid or expired."})
        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            raise ValidationError({"token": "This password reset link is invalid or expired."})
        try:
            validate_password(serializer.validated_data["new_password"], user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": exc.messages})
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        _blacklist_user_sessions(user)
        response = Response({"detail": "Password reset complete."})
        _clear_auth_cookies(response)
        return response


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
# OAuth state（CSRF 対策）— Django サーバーセッションに依存しない方式
#
# 従来は request.session に oauth_state を保存して照合していたが、フロント(Vercel)／
# バックエンド(Render)＋Next proxy の構成ではセッションの共有が不安定で、Google/GitHub
# ログインが「たまに失敗」していた。そこで:
#   - state = 署名付き（改ざん検知＋有効期限）で next パスと nonce を内包する文字列
#   - nonce は短命 Cookie（フロントドメインで発行）にも入れ、コールバックで二重照合する
# ことで、セッションに依存せずログイン CSRF も防ぐ。
# ---------------------------------------------------------------------------

_OAUTH_NONCE_COOKIE = "oauth_nonce"
_OAUTH_STATE_SALT = "oauth-state"
_OAUTH_STATE_MAX_AGE = 600  # 秒（10分）


def _make_oauth_state(next_path: str) -> tuple[str, str]:
    """(署名付き state, nonce) を返す。state は URL に載せ、nonce は Cookie に入れる。"""
    nonce = secrets.token_urlsafe(24)
    state = signing.dumps({"nonce": nonce, "next": next_path}, salt=_OAUTH_STATE_SALT)
    return state, nonce


def _set_oauth_nonce_cookie(response, nonce: str) -> None:
    response.set_cookie(
        _OAUTH_NONCE_COOKIE,
        nonce,
        max_age=_OAUTH_STATE_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
    )


def _verify_oauth_state(request: Request) -> str:
    """state の署名・有効期限・nonce Cookie 一致を検証し、next パスを返す。

    不正なら signing.BadSignature を送出する（呼び出し側で error リダイレクト）。
    """
    state = request.GET.get("state")
    cookie_nonce = request.COOKIES.get(_OAUTH_NONCE_COOKIE)
    if not state or not cookie_nonce:
        raise signing.BadSignature("missing state or nonce cookie")

    data = signing.loads(state, salt=_OAUTH_STATE_SALT, max_age=_OAUTH_STATE_MAX_AGE)
    if not secrets.compare_digest(str(data.get("nonce", "")), cookie_nonce):
        raise signing.BadSignature("nonce mismatch")
    return _safe_next_path(data.get("next"))


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

class GoogleOAuthView(APIView):
    """GET /api/auth/oauth/google/ → Google 認証ページへリダイレクト"""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> HttpResponseRedirect:
        next_path = _safe_next_path(request.GET.get("next"))
        state, nonce = _make_oauth_state(next_path)

        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
        }
        response = HttpResponseRedirect(f"{_GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}")
        _set_oauth_nonce_cookie(response, nonce)
        return response


class GoogleCallbackView(APIView):
    """GET /api/auth/oauth/google/callback/ → JWT Cookie 設定 → フロントへリダイレクト"""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> HttpResponseRedirect:
        code = request.GET.get("code")
        if not code:
            return _oauth_error_redirect()
        try:
            next_path = _verify_oauth_state(request)
        except signing.BadSignature:
            return _oauth_error_redirect()

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
        response.delete_cookie(_OAUTH_NONCE_COOKIE)
        return response


# ---------------------------------------------------------------------------
# GitHub OAuth
# ---------------------------------------------------------------------------

class GithubOAuthView(APIView):
    """GET /api/auth/oauth/github/ → GitHub 認証ページへリダイレクト"""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> HttpResponseRedirect:
        next_path = _safe_next_path(request.GET.get("next"))
        state, nonce = _make_oauth_state(next_path)

        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "read:user user:email",
            "state": state,
        }
        response = HttpResponseRedirect(f"{_GITHUB_AUTH_URL}?{urllib.parse.urlencode(params)}")
        _set_oauth_nonce_cookie(response, nonce)
        return response


class GithubCallbackView(APIView):
    """GET /api/auth/oauth/github/callback/ → JWT Cookie 設定 → フロントへリダイレクト"""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> HttpResponseRedirect:
        code = request.GET.get("code")
        if not code:
            return _oauth_error_redirect()
        try:
            next_path = _verify_oauth_state(request)
        except signing.BadSignature:
            return _oauth_error_redirect()

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
        response.delete_cookie(_OAUTH_NONCE_COOKIE)
        return response
