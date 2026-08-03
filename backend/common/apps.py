from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "common"
    verbose_name = "共通基盤"

    def ready(self):
        # drf-spectacular の拡張は import された時点で登録される。
        # スキーマ生成時に必ず読まれるよう、アプリの起動時に通しておく。
        from . import schema  # noqa: F401
