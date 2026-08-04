"""利用者と認証の HTTP 入口。

Cookie の張り方・端末の失効・パスワード再設定の中身は services.py、
公開プロフィールから辿る一覧は selectors.py、外部ログインは oauth.py。
"""

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponseRedirect
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    ValidationError,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError

from common.pagination import StandardPageNumberPagination
from common.schema import DetailSerializer

from . import oauth, selectors, services
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
    SessionSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(APIView):
    """
    ユーザー登録。
    成功するとトークンを HTTP-only Cookie にセットしてログイン状態で返す。
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=RegisterSerializer, responses={201: UserSerializer})
    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        response = Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return services.issue_session(response, user)


class LoginView(APIView):
    """
    ログイン。username + password を検証し、成功したらトークンを Cookie にセットする。
    """

    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=LoginSerializer, responses={200: UserSerializer})
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

        response = Response(UserSerializer(user).data)
        return services.issue_session(response, user)


class LogoutView(APIView):
    """
    ログアウト。Cookie の refresh_token をブラックリストに追加し、両方の Cookie を削除する。

    アクセストークン期限切れ時にもログアウトを成立させたいため AllowAny にしている。
    refresh_token が無ければ blacklist をスキップして Cookie 削除のみ行う。
    """

    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None})
    def post(self, request: Request) -> Response:
        services.blacklist_refresh_cookie(request)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        services.clear_auth_cookies(response)
        return response


class MeView(APIView):
    """GET /api/auth/me/  現在のログインユーザー情報を返す。PATCH でプロフィール更新。"""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)

    @extend_schema(request=ProfileUpdateSerializer, responses={200: UserSerializer})
    def patch(self, request: Request) -> Response:
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


class UserProfileView(APIView):
    """GET /api/users/<username>/  公開プロフィール（認証不要）"""

    permission_classes = [AllowAny]

    @extend_schema(responses={200: PublicUserSerializer, 404: DetailSerializer})
    def get(self, request: Request, username: str) -> Response:
        user = selectors.get_user_or_404(username)
        return Response(PublicUserSerializer(user, context={"request": request}).data)


class UserCommentsView(generics.ListAPIView):
    """GET /api/users/<username>/comments/  ユーザーのコメント一覧（認証不要）"""

    permission_classes = [AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        from comments.serializers import CommentSerializer

        return CommentSerializer

    def get_queryset(self):
        return selectors.public_comments(self.kwargs["username"])


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
        return selectors.public_bookmarks(self.kwargs["username"], self.request.user)

    def get_queryset(self):
        # 自分の /bookmarks と同じ形（種類での絞り込み・節本文つき）で返す。
        # 表示側のカードを共通化しているため、ここだけ形が違うと本文が出ない。
        from bookmarks.filters import filter_by_type
        from bookmarks.selectors import LIST_RELATED, annotate_verse_text

        qs = self.get_base_queryset().select_related(*LIST_RELATED)
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

    @extend_schema(request=None, responses={200: DetailSerializer})
    def post(self, request: Request) -> Response:
        raw_refresh = request.COOKIES.get("refresh_token")
        if not raw_refresh:
            raise NotAuthenticated("refresh_token cookie not found.")

        try:
            access, refresh = services.rotate_refresh_token(raw_refresh)
        except TokenError:
            # 詳細はログ / Sentry に上がっており、クライアントには汎用文言だけ返す
            raise AuthenticationFailed("Invalid refresh token.") from None

        response = Response({"detail": "Token refreshed."})
        services.set_auth_cookies(response, access, refresh)
        return response


class AccountSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: AccountSettingsSerializer})
    def get(self, request: Request) -> Response:
        return Response(AccountSettingsSerializer(request.user).data)


class IdentityUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=IdentityUpdateSerializer, responses={200: AccountSettingsSerializer})
    def patch(self, request: Request) -> Response:
        serializer = IdentityUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AccountSettingsSerializer(user).data)


class NotificationPreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=NotificationPreferencesSerializer,
        responses={200: NotificationPreferencesSerializer},
    )
    def patch(self, request: Request) -> Response:
        serializer = NotificationPreferencesSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PasswordChangeSerializer, responses={200: DetailSerializer})
    def post(self, request: Request) -> Response:
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        services.change_password(request.user, serializer.validated_data["new_password"])
        # 全端末を切ったので、今の端末だけログインし直させる。
        return services.issue_session(Response({"detail": "Password changed."}), request.user)


class SessionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: SessionSerializer(many=True)})
    def get(self, request: Request) -> Response:
        current_jti = services.current_refresh_jti(request)
        tokens = services.active_tokens(request.user).order_by("-created_at")
        return Response(
            [
                {
                    "id": token.jti,
                    "created_at": token.created_at,
                    "expires_at": token.expires_at,
                    "current": token.jti == current_jti,
                }
                for token in tokens
            ]
        )


class SessionRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={204: None, 404: DetailSerializer})
    def delete(self, request: Request, jti: str) -> Response:
        services.revoke_session(request.user, jti)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        # 今使っている端末を切ったなら、Cookie も一緒に落とす。
        if jti == services.current_refresh_jti(request):
            services.clear_auth_cookies(response)
        return response


class RevokeOtherSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses={204: None})
    def post(self, request: Request) -> Response:
        services.blacklist_sessions(request.user, except_jti=services.current_refresh_jti(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccountDeletionView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=AccountDeletionSerializer, responses={204: None})
    def delete(self, request: Request) -> Response:
        serializer = AccountDeletionSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        services.delete_account(request.user)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        services.clear_auth_cookies(response)
        return response


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=PasswordResetRequestSerializer, responses={200: DetailSerializer})
    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.send_password_reset(serializer.validated_data["email"])
        # 宛先が登録済みかどうかで応答を変えない（アカウントの有無を漏らさない）。
        return Response(
            {"detail": "If an account exists for that email address, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: DetailSerializer})
    def post(self, request: Request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = services.resolve_reset_target(data["uid"], data["token"])
        try:
            validate_password(data["new_password"], user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": exc.messages}) from None

        services.change_password(user, data["new_password"])
        response = Response({"detail": "Password reset complete."})
        services.clear_auth_cookies(response)
        return response


# ---------------------------------------------------------------------------
# 外部ログイン（Google / GitHub）
#
# 提供元ごとの差は oauth.py にある。ここは「認証ページへ飛ばす」「戻ってきたら
# Cookie を張ってフロントへ返す」の2手順だけを書く。
# ---------------------------------------------------------------------------


def _start_oauth(request: Request, authorize_url) -> HttpResponseRedirect:
    """認証ページへ送り出す。戻り先と nonce を state / Cookie に仕込む。"""
    state, nonce = oauth.make_state(oauth.safe_next_path(request.GET.get("next")))
    response = HttpResponseRedirect(authorize_url(state))
    oauth.set_nonce_cookie(response, nonce)
    return response


def _finish_oauth(request: Request, fetch_identity, provider: str) -> HttpResponseRedirect:
    """折り返しを受けてログイン状態にする。

    どの段階で失敗しても同じログイン画面（?oauth=error）へ戻す。相手側の
    都合でも失敗しうるので、利用者に見せる違いを作らない。
    """
    code = request.GET.get("code")
    if not code:
        return oauth.error_redirect()
    try:
        next_path = oauth.verify_state(request)
    except signing.BadSignature:
        return oauth.error_redirect()

    identity = fetch_identity(code)
    if identity is None:
        return oauth.error_redirect()

    user = oauth.get_or_create_social_user(provider, *identity)
    response = oauth.success_redirect(next_path)
    services.issue_session(response, user)
    response.delete_cookie(oauth.NONCE_COOKIE)
    return response


_NEXT_PARAM = OpenApiParameter(
    "next",
    str,
    OpenApiParameter.QUERY,
    description="認証後に戻る相対パス。/ で始まらないものは無視する。",
)
_CALLBACK_PARAMS = [
    OpenApiParameter("code", str, OpenApiParameter.QUERY),
    OpenApiParameter("state", str, OpenApiParameter.QUERY),
]


class GoogleOAuthView(APIView):
    """GET /api/auth/oauth/google/ → Google 認証ページへリダイレクト"""

    permission_classes = [AllowAny]

    @extend_schema(parameters=[_NEXT_PARAM], responses={302: None})
    def get(self, request: Request) -> HttpResponseRedirect:
        return _start_oauth(request, oauth.google_authorize_url)


class GoogleCallbackView(APIView):
    """GET /api/auth/oauth/google/callback/ → JWT Cookie 設定 → フロントへリダイレクト"""

    permission_classes = [AllowAny]

    @extend_schema(parameters=_CALLBACK_PARAMS, responses={302: None})
    def get(self, request: Request) -> HttpResponseRedirect:
        return _finish_oauth(request, oauth.fetch_google_identity, "google")


class GithubOAuthView(APIView):
    """GET /api/auth/oauth/github/ → GitHub 認証ページへリダイレクト"""

    permission_classes = [AllowAny]

    @extend_schema(parameters=[_NEXT_PARAM], responses={302: None})
    def get(self, request: Request) -> HttpResponseRedirect:
        return _start_oauth(request, oauth.github_authorize_url)


class GithubCallbackView(APIView):
    """GET /api/auth/oauth/github/callback/ → JWT Cookie 設定 → フロントへリダイレクト"""

    permission_classes = [AllowAny]

    @extend_schema(parameters=_CALLBACK_PARAMS, responses={302: None})
    def get(self, request: Request) -> HttpResponseRedirect:
        return _finish_oauth(request, oauth.fetch_github_identity, "github")
