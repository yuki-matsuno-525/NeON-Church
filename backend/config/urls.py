# ==============================================================
# ルート URL 設定
#
# 各アプリの URL は apps/<アプリ名>/urls.py に定義し、
# ここで include() を使って登録する。
# ==============================================================

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Django 管理画面
    path("admin/", admin.site.urls),

    # ------------------------------------------------------------------
    # OpenAPI スキーマ
    # /api/schema/     → schema.yaml をダウンロード
    # /api/schema/ui/  → Swagger UI（開発時の動作確認に使用）
    # フロントエンドの型生成（openapi-typescript）が /api/schema/ を参照する。
    # ------------------------------------------------------------------
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/schema/ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # ------------------------------------------------------------------
    # ヘルスチェック（Phase 2 で実装予定）
    # Better Stack の uptime monitoring が /healthz/ を定期的に叩く。
    # ------------------------------------------------------------------
    # path("healthz/", include("common.urls")),

    # ------------------------------------------------------------------
    # 各アプリの API エンドポイント（Phase 以降で順次追加）
    # ------------------------------------------------------------------
    # path("api/auth/", include("users.urls")),
    # path("api/", include("bible.urls")),
    # path("api/", include("comments.urls")),
    # path("api/", include("bookmarks.urls")),
    # path("api/", include("notifications.urls")),
]
