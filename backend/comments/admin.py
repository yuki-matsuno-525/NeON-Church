from django.contrib import admin

from .models import Comment, Report, Vote


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "verse", "parent", "is_deleted", "created_at"]
    list_filter = ["is_deleted"]
    ordering = ["-created_at"]
    # 段階6A: 追加した箇所列・投稿時訳を詳細画面で確認できるようにする（表示のみ）。
    readonly_fields = [
        "id", "user", "verse", "parent",
        "canonical_book", "chapter_number", "verse_number", "source_translation",
        "created_at", "updated_at",
    ]


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "comment", "created_at"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "user", "comment", "created_at", "updated_at"]


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["id", "reporter", "comment", "reason", "created_at"]
    list_filter = ["reason"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "reporter", "comment", "reason", "created_at", "updated_at"]
