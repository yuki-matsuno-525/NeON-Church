from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


class _CSRFCheck(CsrfViewMiddleware):
    """
    DRF の SessionAuthentication と同じ方法で CSRF を検証するためのヘルパー。
    _reject が理由文字列を返す（デフォルト実装はレスポンスを返す）ことで
    呼び出し元が reason を文字列として受け取れる。
    """

    def _reject(self, request, reason):
        return reason


class CookieJWTAuthentication(JWTAuthentication):
    """
    Authorization ヘッダではなく、HTTP-only Cookie の access_token を使って認証する。
    Cookie ベースの JWT は CSRF 攻撃に脆弱なため、認証が通ったリクエストに対して
    CSRF チェックを強制する（DRF の SessionAuthentication と同じ挙動）。
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get("access_token")
        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except InvalidToken:
            return None

        self._enforce_csrf(request)

        return self.get_user(validated_token), validated_token

    def _enforce_csrf(self, request) -> None:
        check = _CSRFCheck(lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f"CSRF check failed: {reason}")
