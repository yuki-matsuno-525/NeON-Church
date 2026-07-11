from django.conf import settings
from django.db import models

from common.models import BaseModel


class Bookmark(BaseModel):
    """
    箇所（訳非依存）またはコメントへのブックマーク。
    箇所栞（canonical_book/chapter_number/verse_number）か comment 栞のどちらか一方のみを持つ。

    段階5F: 旧 verse FK を撤去。栞の同一性は訳非依存の箇所（canonical_book / 章 / 節）で決まる。
    作成 API の入力は verse_id のままだが、それは「箇所を特定するための入力」であり保存はしない。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookmarks",
    )
    # 訳非依存の箇所（段階5A で追加、5B でバックフィル、5F で栞の同一性の実体に）。
    canonical_book = models.ForeignKey(
        "bible.CanonicalBook",
        on_delete=models.PROTECT,
        related_name="bookmarks",
        null=True,
        blank=True,
    )
    chapter_number = models.PositiveSmallIntegerField(null=True, blank=True)
    verse_number = models.PositiveSmallIntegerField(null=True, blank=True)
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
                fields=["user", "comment"],
                condition=models.Q(comment__isnull=False),
                name="unique_user_comment_bookmark",
            ),
            # 段階5E: 同一ユーザー・同一箇所の重複栞を DB で禁止（箇所3列が揃う行だけ対象）。
            models.UniqueConstraint(
                fields=["user", "canonical_book", "chapter_number", "verse_number"],
                condition=models.Q(canonical_book__isnull=False)
                & models.Q(chapter_number__isnull=False)
                & models.Q(verse_number__isnull=False),
                name="unique_user_location_bookmark",
            ),
            # 段階5E: 各栞は「comment 栞（comment あり・箇所3列すべて NULL）」か
            # 「箇所栞（comment なし・箇所3列すべて NOT NULL）」のどちらかだけを許可する。
            # verse FK には依存しないので 5F で verse FK を削除しても残せる。
            models.CheckConstraint(
                condition=(
                    (
                        models.Q(comment__isnull=False)
                        & models.Q(canonical_book__isnull=True)
                        & models.Q(chapter_number__isnull=True)
                        & models.Q(verse_number__isnull=True)
                    )
                    | (
                        models.Q(comment__isnull=True)
                        & models.Q(canonical_book__isnull=False)
                        & models.Q(chapter_number__isnull=False)
                        & models.Q(verse_number__isnull=False)
                    )
                ),
                name="bookmark_comment_xor_location",
            ),
        ]
