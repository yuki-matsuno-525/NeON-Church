from django.contrib import admin

from .models import PassageLink, Section, Work


@admin.register(Work)
class WorkAdmin(admin.ModelAdmin):
    list_display = ["slug", "title", "author", "year", "tradition", "language", "license", "readable"]
    list_filter = ["tradition", "language", "license", "readable"]
    search_fields = ["slug", "title", "title_ja", "author", "author_ja"]


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ["work", "order", "heading"]
    list_filter = ["work"]
    search_fields = ["heading", "text"]
    raw_id_fields = ["work"]


@admin.register(PassageLink)
class PassageLinkAdmin(admin.ModelAdmin):
    list_display = ["section", "canonical_book", "chapter", "verse", "chapter_end", "verse_end", "method", "confidence"]
    list_filter = ["method", "canonical_book"]
    raw_id_fields = ["section"]
