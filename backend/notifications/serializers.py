from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from .models import Notification

_SNIPPET_LENGTH = 50


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    comment_id = serializers.SerializerMethodField()
    comment_body_snippet = serializers.SerializerMethodField()
    comment_is_deleted = serializers.SerializerMethodField()
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
            "comment_is_deleted",
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

    def get_comment_is_deleted(self, obj) -> bool:
        if obj.comment_id:
            return obj.comment.is_deleted
        if obj.translation_comment_id:
            return obj.translation_comment.is_deleted
        return False

    def get_translation_project_id(self, obj) -> str | None:
        if obj.translation_comment_id:
            return str(obj.translation_comment.project_id)
        return None

    def get_target_kind(self, obj) -> str | None:
        """ジャンプ先の種別。フロントの URL 組み立て分岐に使う。"""
        if obj.translation_comment_id:
            return "translation_unit"
        root = self._root_comment(obj)
        if root is None:
            return None
        if root.is_qa:
            return "qa"
        # 段階6F: 箇所は canonical_book/章/節の列で判定する（旧 verse/chapter/book FK は撤去済み）。
        if root.verse_number is not None:
            return "verse_comment"
        if root.chapter_number is not None:
            return "chapter_comment"
        if root.canonical_book_id:
            return "book_comment"
        return None

    def _root_comment(self, obj):
        """スレッドの根をたどる（返信の返信でも元の書・章・節へ飛ばすため）。

        親をたどるのは階層の数だけ DB に聞くことになるうえ、1件の通知につき5か所から
        呼ばれていた（種別・書名・章・節・Q&Aか）。1件につき1回だけ辿って覚えておく。
        """
        if not obj.comment_id:
            return None
        cache = self.context.setdefault("_root_comment_cache", {})
        if obj.comment_id in cache:
            return cache[obj.comment_id]
        c = obj.comment
        while c.parent_id is not None:
            c = c.parent
        cache[obj.comment_id] = c
        return c

    def get_book_name(self, obj) -> str | None:
        root = self._root_comment(obj)
        if not root or not root.canonical_book_id:
            return None
        from comments.serializers import _get_location_parts, book_name_cache
        # 書名の引き当てはコメント側と同じ仕組みを使い、一覧のあいだ結果を使い回す。
        name, _, _ = _get_location_parts(root, book_name_cache(self))
        return name or None

    def get_chapter_number(self, obj) -> int | None:
        root = self._root_comment(obj)
        return root.chapter_number if root else None

    def get_verse_number(self, obj) -> int | None:
        root = self._root_comment(obj)
        return root.verse_number if root else None

    def get_translation_unit_id(self, obj) -> str | None:
        if obj.translation_comment_id:
            return str(obj.translation_comment.unit_id)
        return None

    def get_is_qa(self, obj) -> bool:
        root = self._root_comment(obj)
        return bool(root and root.is_qa)
