from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from bible.models import Verse
from .models import Bookmark


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
    # 段階5F: verse は「箇所を特定するための入力」であり保存しない write-only 入力。
    # backend が verse から canonical_book/章/節を導出して保存する（view.perform_create）。
    verse = serializers.PrimaryKeyRelatedField(
        queryset=Verse.objects.all(), write_only=True, required=False
    )
    comment_detail = CommentBriefSerializer(source="comment", read_only=True)
    target_type = serializers.SerializerMethodField()
    # 訳非依存の箇所。フロントは Verse id ではなくこの箇所で栞判定・表示する。
    reference = serializers.SerializerMethodField()

    class Meta:
        model = Bookmark
        fields = ["id", "verse", "comment", "comment_detail", "target_type", "reference", "created_at"]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "comment": {"write_only": True},
        }

    def get_target_type(self, obj):
        if obj.comment_id:
            return "comment"
        if obj.canonical_book_id:
            return "verse"
        return None

    def get_reference(self, obj):
        # 箇所栞なら {book: slug, chapter, verse} を返す。comment 栞は null。
        if obj.canonical_book_id:
            return {
                "book": obj.canonical_book.slug,
                "chapter": obj.chapter_number,
                "verse": obj.verse_number,
            }
        return None

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
