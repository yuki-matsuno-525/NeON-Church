from django.contrib import admin

from .models import Book, Chapter, Verse


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 0
    show_change_link = True


class VerseInline(admin.TabularInline):
    model = Verse
    extra = 0


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ["name", "translation", "order"]
    ordering = ["order"]
    inlines = [ChapterInline]


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ["book", "number"]
    list_filter = ["book"]
    ordering = ["book__order", "number"]
    inlines = [VerseInline]


@admin.register(Verse)
class VerseAdmin(admin.ModelAdmin):
    list_display = ["chapter", "number", "text"]
    list_filter = ["chapter__book"]
    ordering = ["chapter__book__order", "chapter__number", "number"]
