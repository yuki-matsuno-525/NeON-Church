from django.conf import settings
from django.db import models

from common.models import BaseModel


class Bookmark(BaseModel):
    """
    節またはコメントへのブックマーク。
    verse / comment のいずれか一方のみを持つ（両方 null は許容しない）。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookmarks",
    )
    verse = models.ForeignKey(
        "bible.Verse",
        on_delete=models.CASCADE,
        related_name="bookmarks",
        null=True,
        blank=True,
    )
    comment = models.ForeignKey(
        "comments.Comment",
        on_delete=models.CASCADE,
        related_name="bookmarks",
        null=True,
        blank=True,
    )

    class Meta:
        db_table = "bookmarks"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "verse"],
                condition=models.Q(verse__isnull=False),
                name="unique_user_verse_bookmark",
            ),
            models.UniqueConstraint(
                fields=["user", "comment"],
                condition=models.Q(comment__isnull=False),
                name="unique_user_comment_bookmark",
            ),
        ]
