from django.conf import settings
from django.db import models

from common.models import BaseModel


class Bookmark(BaseModel):
    """
    節へのブックマーク。1ユーザー1節1件（unique_constraint で重複防止）。
    削除は物理削除のみ。
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
    )

    class Meta:
        db_table = "bookmarks"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "verse"], name="unique_user_verse_bookmark"),
        ]
