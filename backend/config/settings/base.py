# ==============================================================
# base.py — 全環境共通の Django 設定
#
# dev.py / prod.py はこのファイルをインポートして差分のみ上書きする。
# 秘匿値（SECRET_KEY, DB パスワード等）はここには書かず、
# 環境変数（python-decouple）から取得する。
# ==============================================================

from pathlib import Path

from decouple import Csv, config

# プロジェクトルート（manage.py があるディレクトリ）
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ------------------------------------------------------------------
# セキュリティ
# ------------------------------------------------------------------
# 本番では必ず長いランダム文字列を設定すること
SECRET_KEY = config("DJANGO_SECRET_KEY")

ALLOWED_HOSTS = config("DJANGO_ALLOWED_HOSTS", cast=Csv())

# ------------------------------------------------------------------
# アプリケーション定義
# ------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "drf_spectacular",
]

# プロジェクト固有のアプリ（Phase 2 以降で追加していく）
LOCAL_APPS: list[str] = []

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ------------------------------------------------------------------
# ミドルウェア
# ------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Phase 2 で追加: request_id 付与ミドルウェア
    # "common.middleware.RequestIdMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ------------------------------------------------------------------
# データベース（PostgreSQL）
# DB には UTC で保存し、表示時に日本時間へ変換する。
# ------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("POSTGRES_DB"),
        "USER": config("POSTGRES_USER"),
        "PASSWORD": config("POSTGRES_PASSWORD"),
        "HOST": config("POSTGRES_HOST", default="localhost"),
        "PORT": config("POSTGRES_PORT", default="5432"),
    }
}

# ------------------------------------------------------------------
# パスワードバリデーション
# ------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------
# 国際化
# DB には UTC で保存し、フロントエンド側で日本時間に変換する。
# ------------------------------------------------------------------
LANGUAGE_CODE = "ja"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------
# 静的ファイル
# ------------------------------------------------------------------
STATIC_URL = "static/"

# ------------------------------------------------------------------
# デフォルトの主キー型
# 全モデルは UUIDField を明示的に定義するため、ここは参照されない。
# ------------------------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------
# Django REST Framework
# ------------------------------------------------------------------
REST_FRAMEWORK = {
    # 認証はデフォルト無効（各ビューで permission_classes を明示する）
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    # drf-spectacular で OpenAPI スキーマを自動生成する
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# ------------------------------------------------------------------
# drf-spectacular（OpenAPI スキーマ生成）
# フロントエンドの型生成（openapi-typescript）がこのスキーマを使用する。
# ------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "NeON-Church API",
    "DESCRIPTION": "聖書読書・コメントプラットフォーム NeON-Church の REST API",
    "VERSION": "0.1.0",
}

# ------------------------------------------------------------------
# CSRF
# 書き込み系 API のみ CSRF を必須とする。
# GET 系 API は CSRF なしでアクセス可能。
# ------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", cast=Csv())
