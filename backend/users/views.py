from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


def _set_auth_cookies(response: Response, access: str, refresh: str | None = None) -> None:
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
            raise AuthenticationFailed("ユーザー名またはパスワードが正しくありません。")

        refresh = RefreshToken.for_user(user)
        response = Response(UserSerializer(user).data)
        _set_auth_cookies(response, str(refresh.access_token), str(refresh))
        return response


class LogoutView(APIView):
    """
    ログアウト。Cookie の refresh_token をブラックリストに追加し、両方の Cookie を削除する。
    """

    permission_classes = [IsAuthenticated]

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
    """GET /api/auth/me/  現在のログインユーザー情報を返す。"""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)


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
            raise NotAuthenticated("refresh_token Cookie が見つかりません。")

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

            response = Response({"detail": "トークンを更新しました。"})
            _set_auth_cookies(response, access, str(refresh))
            return response

        except TokenError as e:
            raise AuthenticationFailed(str(e))
