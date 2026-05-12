from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from bible.models import Verse
from .models import Bookmark


class VerseBriefSerializer(serializers.ModelSerializer):
    chapter_number = serializers.IntegerField(source="chapter.number", read_only=True)
    book_name = serializers.CharField(source="chapter.book.name", read_only=True)

    class Meta:
        model = Verse
        fields = ["id", "number", "text", "chapter_number", "book_name"]


class CommentBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    body = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username")
    created_at = serializers.DateTimeField()

    def get_body(self, obj):
        if obj.is_deleted:
            return DELETED_COMMENT_BODY
        return obj.body[:100]


class BookmarkSerializer(serializers.ModelSerializer):
    verse_detail = VerseBriefSerializer(source="verse", read_only=True)
    comment_detail = CommentBriefSerializer(source="comment", read_only=True)
    target_type = serializers.SerializerMethodField()

    class Meta:
        model = Bookmark
        fields = ["id", "verse", "comment", "verse_detail", "comment_detail", "target_type", "created_at"]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "verse": {"write_only": True},
            "comment": {"write_only": True},
        }

    def get_target_type(self, obj):
        if obj.verse_id:
            return "verse"
        if obj.comment_id:
            return "comment"
        return None

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
