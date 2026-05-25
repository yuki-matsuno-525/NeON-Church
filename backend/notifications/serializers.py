from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from .models import Notification

_SNIPPET_LENGTH = 50


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    comment_id = serializers.SerializerMethodField()
    comment_body_snippet = serializers.SerializerMethodField()
    translation_project_id = serializers.SerializerMethodField()

    # 通知のジャンプ先を表す情報。
    # フロントエンドはこれらを元に URL (例: /matthew/3#verse-12) を組み立てる。
    target_kind = serializers.SerializerMethodField()
    book_name = serializers.SerializerMethodField()
    chapter_number = serializers.SerializerMethodField()
    verse_number = serializers.SerializerMethodField()
    translation_unit_id = serializers.SerializerMethodField()
    is_qa = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "actor_username",
            "comment_id",
            "comment_body_snippet",
            "translation_project_id",
            "is_read",
            "created_at",
            "target_kind",
            "book_name",
            "chapter_number",
            "verse_number",
            "translation_unit_id",
            "is_qa",
        ]

    def get_comment_id(self, obj) -> str | None:
        if obj.comment_id:
            return str(obj.comment.id)
        return None

    def get_comment_body_snippet(self, obj) -> str:
        if obj.comment_id:
            if obj.comment.is_deleted:
                return DELETED_COMMENT_BODY
            return obj.comment.body[:_SNIPPET_LENGTH]
        if obj.translation_comment_id:
            tc = obj.translation_comment
            if tc.is_deleted:
                return DELETED_COMMENT_BODY
            return tc.body[:_SNIPPET_LENGTH]
        return ""

    def get_translation_project_id(self, obj) -> str | None:
        if obj.translation_comment_id:
            return str(obj.translation_comment.project_id)
        return None

    def get_target_kind(self, obj) -> str | None:
        """ジャンプ先の種別。フロントの URL 組み立て分岐に使う。"""
        if obj.translation_comment_id:
            return "translation_unit"
        if not obj.comment_id:
            return None
        c = obj.comment
        # スレッドの根をたどって target を決める（返信の返信でも元の verse/chapter/book に飛ぶ）
        root = c
        while root.parent_id is not None:
            root = root.parent
        if root.is_qa:
            return "qa"
        if root.verse_id:
            return "verse_comment"
        if root.chapter_id:
            return "chapter_comment"
        if root.book_id:
            return "book_comment"
        return None

    def _root_comment(self, obj):
        if not obj.comment_id:
            return None
        c = obj.comment
        while c.parent_id is not None:
            c = c.parent
        return c

    def get_book_name(self, obj) -> str | None:
        root = self._root_comment(obj)
        if not root:
            return None
        if root.verse_id:
            return root.verse.chapter.book.name
        if root.chapter_id:
            return root.chapter.book.name
        if root.book_id:
            return root.book.name
        return None

    def get_chapter_number(self, obj) -> int | None:
        root = self._root_comment(obj)
        if not root:
            return None
        if root.verse_id:
            return root.verse.chapter.number
        if root.chapter_id:
            return root.chapter.number
        return None

    def get_verse_number(self, obj) -> int | None:
        root = self._root_comment(obj)
        if not root or not root.verse_id:
            return None
        return root.verse.number

    def get_translation_unit_id(self, obj) -> str | None:
        if obj.translation_comment_id:
            return str(obj.translation_comment.unit_id)
        return None

    def get_is_qa(self, obj) -> bool:
        root = self._root_comment(obj)
        return bool(root and root.is_qa)
