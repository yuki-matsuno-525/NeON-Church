from django.conf import settings
from django.db import models

from common.models import BaseModel


class ReadingProgress(BaseModel):
    """
    ユーザーの読書進捗。1ユーザー1書につき1件（user, book の複合ユニーク）。
    最後に読んだ節を保持し、updated_at で最終読書日時を管理する。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_progress",
    )
    book = models.ForeignKey(
        "bible.Book",
        on_delete=models.CASCADE,
        related_name="reading_progress",
    )
    chapter = models.ForeignKey(
        "bible.Chapter",
        on_delete=models.CASCADE,
        related_name="reading_progress",
    )
    verse = models.ForeignKey(
        "bible.Verse",
        on_delete=models.CASCADE,
        related_name="reading_progress",
    )

    class Meta:
        db_table = "reading_progress"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "book"],
                name="unique_user_book_progress",
            ),
        ]
