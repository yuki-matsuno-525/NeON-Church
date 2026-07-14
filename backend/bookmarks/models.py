from django.conf import settings
from django.db import models

from common.models import BaseModel


class Bookmark(BaseModel):
    """
    箇所（訳非依存）・コメント・翻訳プロジェクトのいずれかへのブックマーク。
    各栞は次の3種のうち **どれか1つ** の対象だけを持つ（排他）。

    - 箇所栞: canonical_book を必ず持ち、粒度で章・節を埋める。
        - 書栞  : canonical_book のみ（chapter/verse は NULL）
        - 章栞  : canonical_book + chapter_number（verse は NULL）
        - 節栞  : canonical_book + chapter_number + verse_number（全て NOT NULL）
      栞の同一性は訳非依存の箇所で決まる。作成 API の入力は verse_id/chapter_id だが、
      それらは「箇所を特定するための入力」であり、保存するのは canonical_book と章・節の番号。
    - comment 栞             : comment のみ。
    - translation_project 栞 : translation_project のみ。
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
    translation_project = models.ForeignKey(
        "translations.TranslationProject",
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
            models.UniqueConstraint(
                fields=["user", "translation_project"],
                condition=models.Q(translation_project__isnull=False),
                name="unique_user_project_bookmark",
            ),
            # 節栞: 同一ユーザー・同一節の重複を禁止（箇所3列が揃う行だけ対象）。
            models.UniqueConstraint(
                fields=["user", "canonical_book", "chapter_number", "verse_number"],
                condition=models.Q(canonical_book__isnull=False)
                & models.Q(chapter_number__isnull=False)
                & models.Q(verse_number__isnull=False),
                name="unique_user_location_bookmark",
            ),
            # 章栞: 同一ユーザー・同一章（節なし）の重複を禁止。
            models.UniqueConstraint(
                fields=["user", "canonical_book", "chapter_number"],
                condition=models.Q(canonical_book__isnull=False)
                & models.Q(chapter_number__isnull=False)
                & models.Q(verse_number__isnull=True),
                name="unique_user_chapter_bookmark",
            ),
            # 書栞: 同一ユーザー・同一書（章・節なし）の重複を禁止。
            models.UniqueConstraint(
                fields=["user", "canonical_book"],
                condition=models.Q(canonical_book__isnull=False)
                & models.Q(chapter_number__isnull=True)
                & models.Q(verse_number__isnull=True),
                name="unique_user_book_bookmark",
            ),
            # 各栞は「comment 栞」「translation_project 栞」「箇所栞」のいずれか1種のみ。
            # 箇所栞は canonical_book 必須で、節があれば章も必須（書→章→節の入れ子）。
            models.CheckConstraint(
                condition=(
                    (
                        models.Q(comment__isnull=False)
                        & models.Q(translation_project__isnull=True)
                        & models.Q(canonical_book__isnull=True)
                        & models.Q(chapter_number__isnull=True)
                        & models.Q(verse_number__isnull=True)
                    )
                    | (
                        models.Q(translation_project__isnull=False)
                        & models.Q(comment__isnull=True)
                        & models.Q(canonical_book__isnull=True)
                        & models.Q(chapter_number__isnull=True)
                        & models.Q(verse_number__isnull=True)
                    )
                    | (
                        models.Q(canonical_book__isnull=False)
                        & models.Q(comment__isnull=True)
                        & models.Q(translation_project__isnull=True)
                        & (
                            models.Q(verse_number__isnull=True)
                            | models.Q(chapter_number__isnull=False)
                        )
                    )
                ),
                name="bookmark_single_target",
            ),
        ]
