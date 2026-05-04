from django.contrib import admin

from .models import Comment, Vote


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "verse", "parent", "is_deleted", "created_at"]
    list_filter = ["is_deleted"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "user", "verse", "parent", "created_at", "updated_at"]


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "comment", "created_at"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "user", "comment", "created_at", "updated_at"]
