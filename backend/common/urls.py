from django.urls import path

from common.views import healthz

urlpatterns = [
    path("", healthz, name="healthz"),
]
