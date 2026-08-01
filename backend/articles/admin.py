from django.contrib import admin

from .models import Article, ArticleComment, ArticleTag


@admin.register(ArticleTag)
class ArticleTagAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    search_fields = ["name"]


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "visibility", "created_at"]
    list_filter = ["visibility", "tags"]
    search_fields = ["title", "summary"]


@admin.register(ArticleComment)
class ArticleCommentAdmin(admin.ModelAdmin):
    list_display = ["article", "user", "is_deleted", "created_at"]
    list_filter = ["is_deleted"]
