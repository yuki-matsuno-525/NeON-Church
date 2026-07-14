from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from bible.models import Book, Chapter, Verse
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


class ProjectBriefSerializer(serializers.Serializer):
    # プロジェクト栞から「どのプロジェクトか」を表示し、そのページ（/translations/{id}）へ
    # リンクするための素材。プロジェクトは slug を持たず id で辿る。
    id = serializers.UUIDField()
    name = serializers.CharField()


class BookmarkSerializer(serializers.ModelSerializer):
    # verse/chapter/book は「箇所を特定するための入力」であり保存しない write-only 入力。
    # backend が canonical_book/章/節を導出して保存する（view.perform_create）。
    # verse=節栞 / chapter=章栞 / book=書栞 / comment=コメント栞 / translation_project=プロジェクト栞。
    verse = serializers.PrimaryKeyRelatedField(
        queryset=Verse.objects.all(), write_only=True, required=False
    )
    chapter = serializers.PrimaryKeyRelatedField(
        queryset=Chapter.objects.all(), write_only=True, required=False
    )
    book = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(), write_only=True, required=False
    )
    comment_detail = CommentBriefSerializer(source="comment", read_only=True)
    project_detail = ProjectBriefSerializer(source="translation_project", read_only=True)
    target_type = serializers.SerializerMethodField()
    # 訳非依存の箇所。フロントは Verse id ではなくこの箇所で栞判定・表示する。
    reference = serializers.SerializerMethodField()
    # 節栞の表示用本文（view が annotate。口語訳優先、それ以外の栞では null）。
    verse_text = serializers.SerializerMethodField()

    class Meta:
        model = Bookmark
        fields = [
            "id", "verse", "chapter", "book", "comment", "translation_project",
            "comment_detail", "project_detail", "target_type", "reference",
            "verse_text", "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "comment": {"write_only": True},
            "translation_project": {"write_only": True},
        }

    def get_target_type(self, obj):
        if obj.comment_id:
            return "comment"
        if obj.translation_project_id:
            return "project"
        if obj.canonical_book_id:
            if obj.verse_number is not None:
                return "verse"
            if obj.chapter_number is not None:
                return "chapter"
            return "book"
        return None

    def get_reference(self, obj):
        # 箇所栞（書/章/節）なら {book: slug, chapter, verse} を返す。粒度に応じて章・節は null。
        # comment/project 栞は null。
        if obj.canonical_book_id:
            return {
                "book": obj.canonical_book.slug,
                "chapter": obj.chapter_number,
                "verse": obj.verse_number,
            }
        return None

    def get_verse_text(self, obj):
        # view が annotate した表示用本文。節栞以外や本文が引けない場合は null。
        return getattr(obj, "verse_text", None)

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
