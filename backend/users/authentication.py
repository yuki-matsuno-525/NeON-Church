from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


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

        # 無効/期限切れ/破損トークンはすべて「未認証」として黙殺する。
        # 認証が必須のエンドポイントは permission_classes=[IsAuthenticated] で
        # その後弾かれるため、書き込み系の安全性は維持される。
        # iOS Safari の ITP で Cookie が部分破損する症状で 401 連鎖を防ぐ目的。
        try:
            validated_token = self.get_validated_token(raw_token)
        except Exception:
            return None

        try:
            self._enforce_csrf(request)
        except exceptions.PermissionDenied:
            return None

        # トークンは正しくても、指すユーザーが既に存在しないことがある
        # （DB リセットやアカウント削除後に古い Cookie が残るケース）。
        # これも「未認証」として黙殺し、ログイン等の再認証を妨げないようにする。
        try:
            user = self.get_user(validated_token)
        except exceptions.AuthenticationFailed:
            return None

        return user, validated_token

    def _enforce_csrf(self, request) -> None:
        check = _CSRFCheck(lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f"CSRF check failed: {reason}")
