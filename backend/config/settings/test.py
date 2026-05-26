"""
テスト専用 Django 設定。

SQLite を使用して外部 DB サービスなしでテストを実行できる。
CI とローカル開発どちらでも使える。
"""

import os

os.environ.setdefault("DJANGO_SECRET_KEY", "django-insecure-test-only-key-not-for-production")
os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "*")
# base.py が decouple で読む DB 設定のダミー値（test.py で SQLite に上書きするため実際には使用しない）
os.environ.setdefault("POSTGRES_DB", "test_db")
os.environ.setdefault("POSTGRES_USER", "test_user")
os.environ.setdefault("POSTGRES_PASSWORD", "test_pass")
os.environ.setdefault("CSRF_TRUSTED_ORIGINS", "http://localhost")

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# SQLite（ファイルレス）に切り替え
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# スロットリングを緩める
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "auth": "1000/min",
    "comment_create": "1000/min",
    "report": "1000/min",
}
