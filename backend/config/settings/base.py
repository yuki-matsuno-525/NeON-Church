# ==============================================================
# base.py — 全環境共通の Django 設定
#
# dev.py / prod.py はこのファイルをインポートして差分のみ上書きする。
# 秘匿値（SECRET_KEY, DB パスワード等）はここには書かず、
# 環境変数（python-decouple）から取得する。
# ==============================================================

from datetime import timedelta
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
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    # JWT のブラックリスト機能（ログアウト・rotation で使用）
    "rest_framework_simplejwt.token_blacklist",
]

# プロジェクト固有のアプリ
LOCAL_APPS: list[str] = [
    "common",
    "users",
    "bible",
    "comments",
    "bookmarks",
    "notifications",
    "reading_progress",
    "translations",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ------------------------------------------------------------------
# ミドルウェア
# ------------------------------------------------------------------
MIDDLEWARE = [
    # リクエストの最外層に置き、全レスポンスに X-Request-Id を付与する
    "common.middleware.RequestIdMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    # 静的ファイルを WhiteNoise で配信する（本番のみ実際に使われる）
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
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
# 静的ファイル・メディアファイル
# ------------------------------------------------------------------
STATIC_URL = "static/"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ------------------------------------------------------------------
# カスタムユーザーモデル
# AbstractUser を UUID 主キーに拡張したモデルを使用する。
# この設定は最初の migrate より前に確定している必要がある。
# ------------------------------------------------------------------
AUTH_USER_MODEL = "users.User"

# ------------------------------------------------------------------
# デフォルトの主キー型
# 全モデルは UUIDField を明示的に定義するため、ここは参照されない。
# ------------------------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------
# Django REST Framework
# ------------------------------------------------------------------
REST_FRAMEWORK = {
    # HTTP-only Cookie からトークンを取得するカスタム認証クラスを使用する
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authentication.CookieJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    # drf-spectacular で OpenAPI スキーマを自動生成する
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # ビューごとに ScopedRateThrottle を設定する（グローバルは未設定）
    "DEFAULT_THROTTLE_RATES": {
        "auth": "5/min",           # login / register
        "comment_create": "10/min", # コメント投稿
        "report": "5/min",         # 通報
    },
}

# ------------------------------------------------------------------
# simplejwt
# access_token: 20分 / refresh_token: 20日 / rotation あり
# ------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=20),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=20),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
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
# OAuth（Google / GitHub）
# CLIENT_ID / SECRET は各プロバイダーの開発者コンソールで発行する。
# 未設定のときは OAuth ログインボタンを表示しない（フロントが確認する）。
# ------------------------------------------------------------------
GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = config("GOOGLE_CLIENT_SECRET", default="")
GOOGLE_REDIRECT_URI = config("GOOGLE_REDIRECT_URI", default="")

GITHUB_CLIENT_ID = config("GITHUB_CLIENT_ID", default="")
GITHUB_CLIENT_SECRET = config("GITHUB_CLIENT_SECRET", default="")
GITHUB_REDIRECT_URI = config("GITHUB_REDIRECT_URI", default="")

FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

# ------------------------------------------------------------------
# CSRF
# 書き込み系 API のみ CSRF を必須とする。
# GET 系 API は CSRF なしでアクセス可能。
# ------------------------------------------------------------------
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", cast=Csv())

# ------------------------------------------------------------------
# CORS
# ------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", cast=Csv(), default="")
CORS_ALLOW_CREDENTIALS = True

# ------------------------------------------------------------------
# ロギング（JSON 構造化ログ）
# RequestIdFilter が各レコードに request_id を付与する。
# dev.py では root レベルを DEBUG に上書きする。
# ------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "request_id": {
            "()": "common.logging.RequestIdFilter",
        },
    },
    "formatters": {
        "json": {
            "()": "common.logging.JsonFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
            "filters": ["request_id"],
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}
