"""
E2E テスト専用 Django 設定。

SQLite ファイルを使用して Docker/PostgreSQL なしでサーバーを起動できる。
Playwright E2E テストはこの設定で起動した Django サーバーに接続する。
"""

import os

os.environ.setdefault("DJANGO_SECRET_KEY", "django-insecure-e2e-test-key-not-for-production")
os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "*")

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

CORS_ALLOW_ALL_ORIGINS = True

# SQLite ファイル（サーバー再起動でデータが消えないように）
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "e2e_test.sqlite3",  # noqa: F405
    }
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# スロットリングを緩める（E2E テストで連続登録・ログインを行うため）
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "auth": "1000/min",
    "comment_create": "1000/min",
    "report": "1000/min",
}
