from rest_framework import serializers

from bible.models import Verse
from .models import Bookmark


class VerseBriefSerializer(serializers.ModelSerializer):
    """ブックマーク一覧で verse の概要を返す読み取り専用シリアライザ。"""

    chapter_number = serializers.IntegerField(source="chapter.number", read_only=True)
    book_name = serializers.CharField(source="chapter.book.name", read_only=True)

    class Meta:
        model = Verse
        fields = ["id", "number", "text", "chapter_number", "book_name"]


class BookmarkSerializer(serializers.ModelSerializer):
    verse_detail = VerseBriefSerializer(source="verse", read_only=True)

    class Meta:
        model = Bookmark
        fields = ["id", "verse", "verse_detail", "created_at"]
        read_only_fields = ["id", "created_at"]
        # verse は書き込み専用（verse_detail で表示する）
        extra_kwargs = {"verse": {"write_only": True}}

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
