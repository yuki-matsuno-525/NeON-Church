from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import SocialAccount, User


class SocialAccountInline(admin.TabularInline):
    model = SocialAccount
    extra = 0
    readonly_fields = ["provider", "provider_uid", "created_at"]
    can_delete = False


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """荒らしへの対処用。「有効」のチェックを外すと、その人はログインも投稿もできなくなる。"""

    list_display = ["username", "email", "is_active", "is_staff", "date_joined", "last_login"]
    list_filter = ["is_active", "is_staff", "is_superuser"]
    search_fields = ["username", "email"]
    ordering = ["-date_joined"]
    inlines = [SocialAccountInline]
    actions = ["deactivate_users", "activate_users"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("NeON Church", {"fields": ["bio", "bookmarks_visibility"]}),
    )

    @admin.action(description="選んだユーザーを利用停止にする")
    def deactivate_users(self, request, queryset):
        # 自分自身や管理者を誤って止めないよう、一般ユーザーだけを対象にする。
        updated = queryset.filter(is_staff=False).update(is_active=False)
        self.message_user(request, f"{updated} 人を利用停止にしました。")

    @admin.action(description="選んだユーザーの利用停止を解除する")
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} 人の利用停止を解除しました。")
