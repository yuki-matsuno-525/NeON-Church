from django.conf import settings
from django.db import models

from common.models import BaseModel


class Notification(BaseModel):
    """
    通知。返信・upvote のトリガーで作成される。
    recipient: 通知を受け取るユーザー
    actor: 通知をトリガーしたユーザー
    """

    REPLY = "reply"
    UPVOTE = "upvote"
    TYPE_CHOICES = [
        (REPLY, "返信"),
        (UPVOTE, "いいね"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="triggered_notifications",
    )
    notification_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    # 返信通知: 返信コメント / upvote 通知: いいねされたコメント
    comment = models.ForeignKey(
        "comments.Comment",
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
