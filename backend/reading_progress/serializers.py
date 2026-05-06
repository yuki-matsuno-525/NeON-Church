from rest_framework import serializers

from .models import ReadingProgress


class ReadingProgressSerializer(serializers.ModelSerializer):
    book_name = serializers.CharField(source="book.name", read_only=True)
    chapter_number = serializers.IntegerField(source="chapter.number", read_only=True)
    verse_number = serializers.IntegerField(source="verse.number", read_only=True)

    class Meta:
        model = ReadingProgress
        fields = [
            "id",
            "book",
            "book_name",
            "chapter",
            "chapter_number",
            "verse",
            "verse_number",
            "updated_at",
        ]
        read_only_fields = ["id", "book_name", "chapter_number", "verse_number", "updated_at"]
