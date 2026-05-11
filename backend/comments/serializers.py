from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, Report, Tag
from bible.models import Verse, Chapter, Book

User = get_user_model()

_DELETED_BODY = "このコメントは削除されました"


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class CommentAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class CommentSerializer(serializers.ModelSerializer):
    user = CommentAuthorSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, write_only=True, required=False, source="tags"
    )

    class Meta:
        model = Comment
        fields = ["id", "user", "verse", "chapter", "book", "parent", "body", "is_qa", "is_deleted", "created_at", "vote_count", "tags", "tag_ids"]
        read_only_fields = ["id", "user", "is_deleted", "created_at", "vote_count", "tags"]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def to_representation(self, instance: Comment) -> dict:
        """論理削除済みのコメントは body を差し替えて返す。"""
        data = super().to_representation(instance)
        if instance.is_deleted:
            data["body"] = _DELETED_BODY
        return data

    def validate(self, data):
        verse = data.get("verse")
        chapter = data.get("chapter")
        book = data.get("book")

        targets = [x for x in [verse, chapter, book] if x is not None]
        if len(targets) != 1:
            raise serializers.ValidationError(
                "verse, chapter, book のうちいずれか一つを指定してください。"
            )

        parent = data.get("parent")
        if parent:
            if verse and parent.verse_id != verse.pk:
                raise serializers.ValidationError(
                    {"parent": "返信先コメントは同じ節のものである必要があります。"}
                )
            elif chapter and parent.chapter_id != chapter.pk:
                raise serializers.ValidationError(
                    {"parent": "返信先コメントは同じ章のものである必要があります。"}
                )
            elif book and parent.book_id != book.pk:
                raise serializers.ValidationError(
                    {"parent": "返信先コメントは同じ書のものである必要があります。"}
                )

        return data

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        validated_data["user"] = self.context["request"].user
        comment = super().create(validated_data)
        if tags:
            comment.tags.set(tags)
        return comment


class CommentEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["body"]

    def validate_body(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("本文を入力してください。")
        return value

    def update(self, instance, validated_data):
        instance.body = validated_data["body"]
        instance.save(update_fields=["body", "updated_at"])
        return instance


class MyCommentSerializer(serializers.ModelSerializer):
    """自分のコメント一覧用。投稿先の書名・章番号を含む。"""

    user = CommentAuthorSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    location_label = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "user", "body", "created_at", "vote_count", "location_label"]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def get_location_label(self, obj) -> str:
        if obj.verse_id:
            try:
                verse = Verse.objects.select_related("chapter__book").get(pk=obj.verse_id)
                return f"{verse.chapter.book.name} {verse.chapter.number}章 {verse.number}節"
            except Verse.DoesNotExist:
                pass
        if obj.chapter_id:
            try:
                ch = Chapter.objects.select_related("book").get(pk=obj.chapter_id)
                return f"{ch.book.name} {ch.number}章"
            except Chapter.DoesNotExist:
                pass
        if obj.book_id:
            try:
                book = Book.objects.get(pk=obj.book_id)
                return book.name
            except Book.DoesNotExist:
                pass
        return ""


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "reason", "created_at"]
        read_only_fields = ["id", "created_at"]
