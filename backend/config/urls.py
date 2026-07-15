# ==============================================================
# ルート URL 設定
#
# 各アプリの URL は apps/<アプリ名>/urls.py に定義し、
# ここで include() を使って登録する。
# ==============================================================

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from common.urls import csrf_urlpatterns

urlpatterns = [
    # Django 管理画面
    path("admin/", admin.site.urls),
]

# OpenAPI スキーマ・Swagger UI は開発環境のみ公開
if settings.DEBUG:
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/schema/ui/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]

urlpatterns += [
    # ------------------------------------------------------------------
    # ヘルスチェック
    # Better Stack の uptime monitoring が /healthz/ を定期的に叩く。
    # ------------------------------------------------------------------
    path("healthz/", include("common.urls")),

    # ------------------------------------------------------------------
    # 各アプリの API エンドポイント（Phase 以降で順次追加）
    # ------------------------------------------------------------------
    path("api/", include(csrf_urlpatterns)),
    path("api/auth/", include("users.urls")),
    path("api/users/", include("users.public_urls")),
    path("api/", include("bible.urls")),
    path("api/", include("comments.urls")),
    path("api/", include("bookmarks.urls")),
    path("api/", include("notifications.urls")),
    path("api/", include("reading_progress.urls")),
    path("api/", include("translations.urls")),
    path("api/", include("compilations.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
