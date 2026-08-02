from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from .models import Notification

_SNIPPET_LENGTH = 50


class NotificationSerializer(serializers.ModelSerializer):
    """通知1件。

    通知の対象は3種類ある（コメント / 翻訳コメント / Q&A の回答）。どれであっても
    「誰が」「何と書いたか」「どこへ飛ぶか」を同じ形で返し、フロントは target_kind で
    URL の組み立てだけを分岐する。
    """

    actor_username = serializers.CharField(source="actor.username", read_only=True)
    # 対象の文章。コメントでも回答でも同じフィールドに入る。
    body_snippet = serializers.SerializerMethodField()
    body_is_deleted = serializers.SerializerMethodField()
    comment_id = serializers.SerializerMethodField()
    question_id = serializers.SerializerMethodField()
    translation_project_id = serializers.SerializerMethodField()

    # 通知のジャンプ先を表す情報。
    # フロントエンドはこれらを元に URL (例: /matthew/3#verse-12) を組み立てる。
    target_kind = serializers.SerializerMethodField()
    book_name = serializers.SerializerMethodField()
    chapter_number = serializers.SerializerMethodField()
    verse_number = serializers.SerializerMethodField()
    translation_unit_id = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "actor_username",
            "body_snippet",
            "body_is_deleted",
            "comment_id",
            "question_id",
            "translation_project_id",
            "is_read",
            "created_at",
            "target_kind",
            "book_name",
            "chapter_number",
            "verse_number",
            "translation_unit_id",
        ]

    # ------------------------------------------------------------------
    # 対象をたどるヘルパー
    # ------------------------------------------------------------------
    def _root_comment(self, obj):
        """コメントのスレッドの根をたどる（返信の返信でも元の箇所へ飛ばすため）。

        親をたどるのは階層の数だけ DB に聞くことになるうえ、1件の通知につき何か所からも
        呼ばれる。1件につき1回だけ辿って覚えておく。
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

    def _question(self, obj):
        """Q&A 通知の飛び先になる質問。回答からたどる。"""
        if not obj.answer_id:
            return None
        return obj.answer.question

    def _located(self, obj):
        """箇所（書・章・節）を持っている対象。コメントの根か、Q&A の質問。"""
        return self._root_comment(obj) or self._question(obj)

    # ------------------------------------------------------------------
    # 対象の文章
    # ------------------------------------------------------------------
    def get_body_snippet(self, obj) -> str:
        for target in (obj.comment if obj.comment_id else None,
                       obj.translation_comment if obj.translation_comment_id else None,
                       obj.answer if obj.answer_id else None):
            if target is None:
                continue
            if target.is_deleted:
                return DELETED_COMMENT_BODY
            return target.body[:_SNIPPET_LENGTH]
        return ""

    def get_body_is_deleted(self, obj) -> bool:
        if obj.comment_id:
            return obj.comment.is_deleted
        if obj.translation_comment_id:
            return obj.translation_comment.is_deleted
        if obj.answer_id:
            return obj.answer.is_deleted
        return False

    def get_comment_id(self, obj) -> str | None:
        return str(obj.comment_id) if obj.comment_id else None

    def get_question_id(self, obj) -> str | None:
        """Q&A 通知の飛び先。フロントは /qa/{question_id} を組み立てる。"""
        return str(obj.answer.question_id) if obj.answer_id else None

    def get_translation_project_id(self, obj) -> str | None:
        if obj.translation_comment_id:
            return str(obj.translation_comment.project_id)
        return None

    def get_translation_unit_id(self, obj) -> str | None:
        if obj.translation_comment_id:
            return str(obj.translation_comment.unit_id)
        return None

    # ------------------------------------------------------------------
    # ジャンプ先
    # ------------------------------------------------------------------
    def get_target_kind(self, obj) -> str | None:
        """ジャンプ先の種別。フロントの URL 組み立て分岐に使う。"""
        if obj.translation_comment_id:
            return "translation_unit"
        if obj.answer_id:
            return "qa"
        root = self._root_comment(obj)
        if root is None:
            return None
        # 箇所は canonical_book/章/節の列で判定する。細かい粒度から順に見る。
        if root.verse_number is not None:
            return "verse_comment"
        if root.chapter_number is not None:
            return "chapter_comment"
        if root.canonical_book_id:
            return "book_comment"
        return None

    def get_book_name(self, obj) -> str | None:
        target = self._located(obj)
        if not target or not target.canonical_book_id:
            return None
        from bible.passage import book_name_for

        # 書名の引き当ては一覧のあいだ結果を使い回す（訳ごとに呼び名が違うため DB を引く）。
        cache = self.context.setdefault("_book_name_cache", {})
        name = book_name_for(target.canonical_book_id, target.source_translation, cache)
        return name or None

    def get_chapter_number(self, obj) -> int | None:
        target = self._located(obj)
        return target.chapter_number if target else None

    def get_verse_number(self, obj) -> int | None:
        target = self._located(obj)
        return target.verse_number if target else None
