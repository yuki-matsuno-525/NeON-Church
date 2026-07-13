from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from bible.models import Verse
from .models import Bookmark


class CommentBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    body = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username")
    created_at = serializers.DateTimeField()
    # コメント栞から「どの箇所へのコメントか」を表示し、その節へリンクするための素材。
    # 表示用ラベルと、リンク組み立て用の slug/章/節/訳を返す（プロフィールのコメント一覧と同じ形）。
    location_label = serializers.SerializerMethodField()
    book_slug = serializers.SerializerMethodField()
    chapter_number = serializers.IntegerField(read_only=True)
    verse_number = serializers.IntegerField(read_only=True)
    source_translation = serializers.CharField(read_only=True)

    def get_body(self, obj):
        if obj.is_deleted:
            return DELETED_COMMENT_BODY
        return obj.body[:100]

    def get_location_label(self, obj):
        from comments.serializers import _format_location_label, _get_location_parts
        book, chapter, verse = _get_location_parts(obj)
        return _format_location_label(book, chapter, verse)

    def get_book_slug(self, obj):
        return obj.canonical_book.slug if obj.canonical_book_id else ""


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
    # 節栞の表示用本文（view が annotate。口語訳優先、comment 栞では null）。
    verse_text = serializers.SerializerMethodField()

    class Meta:
        model = Bookmark
        fields = ["id", "verse", "comment", "comment_detail", "target_type", "reference", "verse_text", "created_at"]
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

    def get_verse_text(self, obj):
        # view が annotate した表示用本文。comment 栞や本文が引けない場合は null。
        return getattr(obj, "verse_text", None)

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
