from django.conf import settings
from django.db import models

from common.models import BaseModel


class Comment(BaseModel):
    """
    コメント。parent FK によるツリー構造、is_deleted による論理削除。
    論理削除時は body をクリアし、シリアライザ側で「削除されました」と表示する。
    物理削除は行わない（子コメントの親参照を維持するため）。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    verse = models.ForeignKey(
        "bible.Verse",
        on_delete=models.CASCADE,
        related_name="comments",
    )
    # 返信先コメント。null の場合はトップレベルコメント。
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    body = models.TextField()
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "comments"
        ordering = ["-created_at"]


class Vote(BaseModel):
    """
    コメントへの upvote。1ユーザー1コメント1票（unique_together で二重投票防止）。
    物理削除のみ（投票取り消しは DELETE で Vote レコードを削除する）。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="votes",
    )

    class Meta:
        db_table = "votes"
        constraints = [
            models.UniqueConstraint(fields=["user", "comment"], name="unique_user_comment_vote"),
        ]
