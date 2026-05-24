from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from .models import Notification

_SNIPPET_LENGTH = 50


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    comment_id = serializers.SerializerMethodField()
    comment_body_snippet = serializers.SerializerMethodField()
    translation_project_id = serializers.SerializerMethodField()

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
