from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, Report, Tag

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
        parent = data.get("parent")
        is_qa = data.get("is_qa", False)

        targets = [x for x in [verse, chapter, book] if x is not None]
        # Q&A または返信は場所なしを許可（通常コメントは必ず1つ）
        if not parent and not is_qa:
            if len(targets) != 1:
                raise serializers.ValidationError(
                    "verse, chapter, book のうちいずれか一つを指定してください。"
                )
        elif len(targets) > 1:
            raise serializers.ValidationError(
                "verse, chapter, book のうち最大一つを指定してください。"
            )

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
            v = obj.verse
            if v:
                return f"{v.chapter.book.name} {v.chapter.number}章 {v.number}節"
        if obj.chapter_id:
            ch = obj.chapter
            if ch:
                return f"{ch.book.name} {ch.number}章"
        if obj.book_id:
            bk = obj.book
            if bk:
                return bk.name
        return ""


class BestAnswerSerializer(serializers.ModelSerializer):
    user = CommentAuthorSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "user", "body", "created_at"]


class QACommentSerializer(serializers.ModelSerializer):
    user = CommentAuthorSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)
    location_label = serializers.SerializerMethodField()
    book_name = serializers.SerializerMethodField()
    chapter_number = serializers.SerializerMethodField()
    verse_number = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    best_answer = BestAnswerSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id", "user", "body", "created_at", "vote_count",
            "tags", "location_label", "book_name", "chapter_number", "verse_number",
            "reply_count", "best_answer",
        ]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def get_reply_count(self, obj) -> int:
        if hasattr(obj, "reply_count"):
            return obj.reply_count
        return obj.replies.filter(is_deleted=False).count()

    def get_book_name(self, obj) -> str:
        if obj.verse_id:
            return obj.verse.chapter.book.name
        if obj.chapter_id:
            return obj.chapter.book.name
        if obj.book_id:
            return obj.book.name
        return ""

    def get_chapter_number(self, obj):
        if obj.verse_id:
            return obj.verse.chapter.number
        if obj.chapter_id:
            return obj.chapter.number
        return None

    def get_verse_number(self, obj):
        if obj.verse_id:
            return obj.verse.number
        return None

    def get_location_label(self, obj) -> str:
        book = self.get_book_name(obj)
        ch = self.get_chapter_number(obj)
        v = self.get_verse_number(obj)
        if v is not None:
            return f"{book} {ch}章 {v}節"
        if ch is not None:
            return f"{book} {ch}章"
        return book


class CommentSearchSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    location = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "body", "username", "created_at", "location"]

    def get_location(self, obj) -> str:
        if obj.verse_id:
            return f"{obj.verse.chapter.book.name} {obj.verse.chapter.number}章{obj.verse.number}節"
        if obj.chapter_id:
            return f"{obj.chapter.book.name} {obj.chapter.number}章"
        if obj.book_id:
            return obj.book.name
        return ""


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "reason", "created_at"]
        read_only_fields = ["id", "created_at"]
