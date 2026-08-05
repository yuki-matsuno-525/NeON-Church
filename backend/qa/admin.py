from django.contrib import admin

from .models import Answer, Question


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "title",
        "user",
        "canonical_book",
        "chapter_number",
        "verse_number",
        "is_deleted",
        "created_at",
    ]
    list_filter = ["is_deleted"]
    search_fields = ["title", "body"]
    ordering = ["-created_at"]
    readonly_fields = [
        "id",
        "user",
        "canonical_book",
        "chapter_number",
        "verse_number",
        "source_translation",
        "created_at",
        "updated_at",
    ]


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ["id", "question", "user", "is_deleted", "created_at"]
    list_filter = ["is_deleted"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "question", "user", "created_at", "updated_at"]
