from django.contrib import admin

from .models import Comment, Report, Vote


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "canonical_book", "chapter_number", "verse_number", "parent", "is_deleted", "created_at"]
    list_filter = ["is_deleted"]
    ordering = ["-created_at"]
    readonly_fields = [
        "id", "user", "parent",
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
