from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from bible.models import Book, Chapter, Verse
from comments.models import DELETED_COMMENT_BODY

from .models import Bookmark


class BookmarkReferenceSerializer(serializers.Serializer):
    """箇所のお気に入り（書/章/節）が指す位置。スキーマに形を出すためだけの宣言。"""

    book = serializers.CharField(help_text="正典書の slug")
    chapter = serializers.IntegerField(allow_null=True)
    verse = serializers.IntegerField(allow_null=True)


class CommentBriefSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    body = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username")
    created_at = serializers.DateTimeField()
    # コメントのお気に入りから「どの箇所へのコメントか」を表示し、その節へリンクするための素材。
    # 表示用ラベルと、リンク組み立て用の slug/章/節/訳を返す（プロフィールのコメント一覧と同じ形）。
    location_label = serializers.SerializerMethodField()
    book_slug = serializers.SerializerMethodField()
    chapter_number = serializers.IntegerField(read_only=True)
    verse_number = serializers.IntegerField(read_only=True)
    source_translation = serializers.CharField(read_only=True)
    is_deleted = serializers.BooleanField(read_only=True)

    def get_body(self, obj) -> str:
        if obj.is_deleted:
            return DELETED_COMMENT_BODY
        return obj.body[:100]

    def get_location_label(self, obj) -> str:
        from comments.serializers import (
            _format_location_label,
            _get_location_parts,
            book_name_cache,
        )

        # 一覧のあいだ書名の引き当て結果を使い回す（お気に入り1件ごとに Book を引かない）。
        book, chapter, verse = _get_location_parts(obj, book_name_cache(self))
        return _format_location_label(book, chapter, verse)

    def get_book_slug(self, obj) -> str:
        return obj.canonical_book.slug if obj.canonical_book_id else ""


class ProjectBriefSerializer(serializers.Serializer):
    # プロジェクトのお気に入りから「どのプロジェクトか」を表示し、そのページ（/translations/{id}）へ
    # リンクするための素材。プロジェクトは slug を持たず id で辿る。
    id = serializers.UUIDField()
    name = serializers.CharField()


class BookmarkSerializer(serializers.ModelSerializer):
    # verse/chapter/book は「箇所を特定するための入力」であり保存しない write-only 入力。
    # backend が canonical_book/章/節を導出して保存する（view.perform_create）。
    # verse=節のお気に入り / chapter=章のお気に入り / book=書のお気に入り / comment=コメントのお気に入り / translation_project=プロジェクトのお気に入り。
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
    # 訳非依存の箇所。フロントは Verse id ではなくこの箇所でお気に入り判定・表示する。
    reference = serializers.SerializerMethodField()
    # 節のお気に入りの表示用本文（view が annotate。口語訳優先、それ以外のお気に入りでは null）。
    verse_text = serializers.SerializerMethodField()

    class Meta:
        model = Bookmark
        fields = [
            "id",
            "verse",
            "chapter",
            "book",
            "comment",
            "translation_project",
            "comment_detail",
            "project_detail",
            "target_type",
            "reference",
            "verse_text",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {
            "comment": {"write_only": True},
            "translation_project": {"write_only": True},
        }

    def get_target_type(self, obj) -> str | None:
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

    @extend_schema_field(BookmarkReferenceSerializer(allow_null=True))
    def get_reference(self, obj):
        # 箇所のお気に入り（書/章/節）なら {book: slug, chapter, verse} を返す。粒度に応じて章・節は null。
        # comment/project お気に入りは null。
        if obj.canonical_book_id:
            return {
                "book": obj.canonical_book.slug,
                "chapter": obj.chapter_number,
                "verse": obj.verse_number,
            }
        return None

    def get_verse_text(self, obj) -> str | None:
        # view が annotate した表示用本文。節のお気に入り以外や本文が引けない場合は null。
        return getattr(obj, "verse_text", None)

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
