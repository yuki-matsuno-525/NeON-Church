"""認証とアカウント操作の中身。

Cookie の張り方・端末（refresh token）の失効・パスワード再設定など、
「状態を変える」処理をここに集める。ビューは入力を解いてここを呼ぶだけ。

利用者の読み出しは selectors.py、外部ログインは oauth.py。
"""

import logging
import urllib.parse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()
logger = logging.getLogger(__name__)

# 再設定リンクが無効・期限切れのときの文言。どの理由でも同じ文言を返す
# （存在しない利用者と期限切れを区別させない）。
_INVALID_RESET = "This password reset link is invalid or expired."


# ---------------------------------------------------------------------------
# Cookie
# ---------------------------------------------------------------------------


def set_auth_cookies(response, access: str, refresh: str | None = None) -> None:
    """access_token と refresh_token を HTTP-only Cookie にセットする。

    secure フラグは本番（DEBUG=False）のみ有効にする。
    """
    # star import を通るため設定値の型が object に落ちる。ここで dict と明示する。
    jwt_settings: dict = settings.SIMPLE_JWT
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


def clear_auth_cookies(response) -> None:
    """両方の Cookie を確実に消す。

    set_cookie 時と同じパラメータで期限切れにする。delete_cookie では
    secure/samesite が一致せずブラウザに残ることがある。
    """
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


def issue_session(response, user):
    """新しいトークンの組を発行して Cookie に載せる。登録・ログイン・外部ログイン共通。"""
    refresh = RefreshToken.for_user(user)
    set_auth_cookies(response, str(refresh.access_token), str(refresh))
    return response


# ---------------------------------------------------------------------------
# 端末（refresh token）
# ---------------------------------------------------------------------------


def current_refresh_jti(request) -> str | None:
    """今のリクエストが使っている refresh token の識別子。判別できなければ None。"""
    raw_refresh = request.COOKIES.get("refresh_token")
    if not raw_refresh:
        return None
    try:
        return str(RefreshToken(raw_refresh)["jti"])
    except (TokenError, KeyError):
        return None


def active_tokens(user):
    """まだ生きている refresh token（＝ログイン中の端末）。"""
    return OutstandingToken.objects.filter(
        user=user,
        expires_at__gt=timezone.now(),
        blacklistedtoken__isnull=True,
    )


def blacklist_sessions(user, *, except_jti: str | None = None) -> None:
    """端末をまとめて失効させる。パスワード変更・退会・他端末ログアウトで使う。"""
    tokens = active_tokens(user)
    if except_jti:
        tokens = tokens.exclude(jti=except_jti)
    for token in tokens:
        BlacklistedToken.objects.get_or_create(token=token)


def revoke_session(user, jti: str) -> None:
    """端末を1つ失効させる。すでに切れているものは 404（一覧に出ないため）。"""
    try:
        token = OutstandingToken.objects.get(
            user=user,
            jti=jti,
            expires_at__gt=timezone.now(),
        )
    except OutstandingToken.DoesNotExist:
        raise NotFound("Session not found.") from None
    BlacklistedToken.objects.get_or_create(token=token)


def blacklist_refresh_cookie(request) -> None:
    """ログアウト時に、今使っている refresh token だけを失効させる。

    期限切れ・破損していても黙って通す。ログアウトは必ず成立させたい
    （失敗させると Cookie が残ったままログアウトできなくなる）。
    """
    raw_refresh = request.COOKIES.get("refresh_token")
    if not raw_refresh:
        return
    try:
        RefreshToken(raw_refresh).blacklist()
    except (TokenError, AttributeError):
        pass


def rotate_refresh_token(raw_refresh: str) -> tuple[str, str]:
    """refresh token を回して (access, refresh) を返す。古いほうは失効させる。

    TokenError はそのまま送出する（呼び出し側で 401 に翻訳する）。
    """
    # simplejwt の stub は引数を Token と宣言しているが、実体は生の文字列を取る。
    refresh = RefreshToken(raw_refresh)  # type: ignore[arg-type]
    try:
        refresh.blacklist()
    except AttributeError:
        pass
    refresh.set_jti()
    refresh.set_exp()
    refresh.set_iat()
    refresh.outstand()
    return str(refresh.access_token), str(refresh)


# ---------------------------------------------------------------------------
# パスワード
# ---------------------------------------------------------------------------


def change_password(user, new_password: str) -> None:
    """パスワードを変え、他の端末を全部失効させる。

    盗まれたから変える場合があるので、変更後に全端末を切る。呼び出し側は
    このあと issue_session() で今の端末だけログインし直させる。
    """
    user.set_password(new_password)
    user.save(update_fields=["password", "updated_at"])
    blacklist_sessions(user)


def send_password_reset(email: str) -> None:
    """再設定リンクをメールで送る。

    宛先が無くても、外部ログイン専用でパスワードを持たない人でも、
    何も言わずに終える（このメールアドレスが登録済みかを漏らさないため）。
    """
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user or not user.has_usable_password():
        return

    query = urllib.parse.urlencode(
        {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }
    )
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


def resolve_reset_target(uid: str, token: str):
    """再設定リンクの uid と token を検証して利用者を返す。不正なら 400。"""
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValidationError({"token": _INVALID_RESET}) from None

    if not default_token_generator.check_token(user, token):
        raise ValidationError({"token": _INVALID_RESET})
    return user


# ---------------------------------------------------------------------------
# 退会
# ---------------------------------------------------------------------------


def delete_account(user) -> None:
    """退会。先に端末を全部失効させてから行を消す。"""
    blacklist_sessions(user)
    user.delete()
