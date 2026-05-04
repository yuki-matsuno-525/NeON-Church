from django.contrib import admin

from .models import Bookmark


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "verse", "created_at"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "user", "verse", "created_at", "updated_at"]
