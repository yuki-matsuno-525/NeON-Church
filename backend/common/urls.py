from django.urls import path

from common.views import get_csrf_token, healthz

urlpatterns = [
    path("", healthz, name="healthz"),
]

csrf_urlpatterns = [
    path("csrf/", get_csrf_token, name="csrf"),
]
