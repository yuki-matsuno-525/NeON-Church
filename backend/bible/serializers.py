from rest_framework import serializers

from .models import Book, Chapter, Verse


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ["id", "name", "translation", "order"]


class ChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chapter
        fields = ["id", "book", "number"]


class VerseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Verse
        fields = ["id", "chapter", "number", "text"]


class VerseOfDaySerializer(serializers.ModelSerializer):
    book_name = serializers.CharField(source="chapter.book.name", read_only=True)
    chapter_number = serializers.IntegerField(source="chapter.number", read_only=True)
    translation = serializers.CharField(source="chapter.book.translation", read_only=True)

    class Meta:
        model = Verse
        fields = ["id", "number", "text", "book_name", "chapter_number", "translation"]


class VerseSearchSerializer(serializers.ModelSerializer):
    book_name = serializers.CharField(source="chapter.book.name", read_only=True)
    chapter_number = serializers.IntegerField(source="chapter.number", read_only=True)
    chapter_id = serializers.UUIDField(source="chapter.id", read_only=True)
    book_id = serializers.UUIDField(source="chapter.book.id", read_only=True)
    # 訳非依存の書 slug。フロントは book_name の逆引きではなくこれでリンクを組み立てる。
    book_slug = serializers.SerializerMethodField()

    class Meta:
        model = Verse
        fields = ["id", "number", "text", "chapter_number", "chapter_id", "book_name", "book_id", "book_slug"]

    def get_book_slug(self, obj) -> str:
        cb = obj.chapter.book.canonical_book
        return cb.slug if cb else ""
