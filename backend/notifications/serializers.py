from comments.models import DELETED_COMMENT_BODY
from rest_framework import serializers

from .models import Notification

_SNIPPET_LENGTH = 50


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)
    comment_id = serializers.UUIDField(source="comment.id", read_only=True)
    comment_body_snippet = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "actor_username",
            "comment_id",
            "comment_body_snippet",
            "is_read",
            "created_at",
        ]

    def get_comment_body_snippet(self, obj) -> str:
        if obj.comment.is_deleted:
            return DELETED_COMMENT_BODY
        return obj.comment.body[:_SNIPPET_LENGTH]
