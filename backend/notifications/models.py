from django.conf import settings
from django.db import models

from common.models import BaseModel


class Notification(BaseModel):
    """
    通知。返信・upvote・メンションのトリガーで作成される。
    recipient: 通知を受け取るユーザー
    actor: 通知をトリガーしたユーザー
    comment / translation_comment のどちらか一方が設定される。
    """

    REPLY = "reply"
    UPVOTE = "upvote"
    MENTION = "mention"
    TYPE_CHOICES = [
        (REPLY, "Reply"),
        (UPVOTE, "Upvote"),
        (MENTION, "Mention"),
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
    comment = models.ForeignKey(
        "comments.Comment",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    translation_comment = models.ForeignKey(
        "translations.TranslationComment",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    is_read = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
