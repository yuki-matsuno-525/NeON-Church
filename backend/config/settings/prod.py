# ==============================================================
# prod.py — 本番環境専用の Django 設定
#
# base.py の設定を継承し、セキュリティを強化する。
# Render にデプロイする際は DJANGO_SETTINGS_MODULE=config.settings.prod を設定する。
# ==============================================================

import sentry_sdk
from decouple import config
from sentry_sdk.integrations.django import DjangoIntegration

from .base import *  # noqa: F401, F403

DEBUG = False

# ------------------------------------------------------------------
# セキュリティ強化
# ------------------------------------------------------------------
# HTTPS 経由のみ Cookie を送信する（Secure Cookie）
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# HSTS: ブラウザに HTTPS を強制させる（1年間）
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# HTTP → HTTPS リダイレクト
SECURE_SSL_REDIRECT = True

# Render などのリバースプロキシ配下では HTTPS 終端がプロキシ側で行われ、
# Django には HTTP として届く。X-Forwarded-Proto ヘッダを信頼させないと
# SECURE_SSL_REDIRECT と組み合わせて無限リダイレクトになる。
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ------------------------------------------------------------------
# Sentry（エラー監視）
# SENTRY_DSN が設定されていない場合は初期化しない。
# ------------------------------------------------------------------
_sentry_dsn = config("SENTRY_DSN", default="")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[DjangoIntegration()],
        # パフォーマンス計測のサンプリングレート（本番負荷に応じて調整）
        traces_sample_rate=0.1,
        # ユーザー情報をエラーレポートに含める
        send_default_pii=False,
    )

# ------------------------------------------------------------------
# 静的ファイル（本番では whitenoise 等を使うことを検討）
# ------------------------------------------------------------------
STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405

# ------------------------------------------------------------------
# メール（本番では SMTP サービスを設定する）
# ------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
