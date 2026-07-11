from django import forms
from django.contrib import admin

from .models import Book, CanonicalBook, Chapter, Verse


class BookAdminForm(forms.ModelForm):
    """admin から Book を新規作成するときは canonical_book を必須にする。

    既存の canonical_book=NULL データは段階3B のバックフィルまで存在し得るため、
    モデルの null=True は維持し、admin の**新規入力だけ**を制限する。
    """

    class Meta:
        model = Book
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk is None:  # 新規作成時のみ必須
            self.fields["canonical_book"].required = True


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 0
    show_change_link = True


class VerseInline(admin.TabularInline):
    model = Verse
    extra = 0


@admin.register(CanonicalBook)
class CanonicalBookAdmin(admin.ModelAdmin):
    list_display = ["slug"]


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    form = BookAdminForm
    list_display = ["name", "translation", "order", "canonical_book"]
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
