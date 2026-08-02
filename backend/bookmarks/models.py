from django.conf import settings
from django.db import models

from common.models import BaseModel


class Bookmark(BaseModel):
    """
    箇所（訳非依存）・コメント・翻訳プロジェクトのいずれかへのお気に入り。
    各お気に入りは次の3種のうち **どれか1つ** の対象だけを持つ（排他）。

    - 箇所のお気に入り: canonical_book を必ず持ち、粒度で章・節を埋める。
        - 書のお気に入り  : canonical_book のみ（chapter/verse は NULL）
        - 章のお気に入り  : canonical_book + chapter_number（verse は NULL）
        - 節のお気に入り  : canonical_book + chapter_number + verse_number（全て NOT NULL）
      お気に入りの同一性は訳非依存の箇所で決まる。作成 API の入力は verse_id/chapter_id だが、
      それらは「箇所を特定するための入力」であり、保存するのは canonical_book と章・節の番号。
    - コメントのお気に入り             : comment のみ。
    - 翻訳プロジェクトのお気に入り : translation_project のみ。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookmarks",
    )
    # 訳非依存の箇所（段階5A で追加、5B でバックフィル、5F でお気に入りの同一性の実体に）。
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
        indexes = [
            # お気に入り一覧は「自分のお気に入り」を新しい順に出す。読書画面は箇所で絞って引く。
            models.Index(fields=["user", "-created_at"], name="bookmark_user_recent_idx"),
            models.Index(
                fields=["user", "canonical_book", "chapter_number"],
                name="bookmark_user_location_idx",
            ),
        ]
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
            # 節のお気に入り: 同一ユーザー・同一節の重複を禁止（箇所3列が揃う行だけ対象）。
            models.UniqueConstraint(
                fields=["user", "canonical_book", "chapter_number", "verse_number"],
                condition=models.Q(canonical_book__isnull=False)
                & models.Q(chapter_number__isnull=False)
                & models.Q(verse_number__isnull=False),
                name="unique_user_location_bookmark",
            ),
            # 章のお気に入り: 同一ユーザー・同一章（節なし）の重複を禁止。
            models.UniqueConstraint(
                fields=["user", "canonical_book", "chapter_number"],
                condition=models.Q(canonical_book__isnull=False)
                & models.Q(chapter_number__isnull=False)
                & models.Q(verse_number__isnull=True),
                name="unique_user_chapter_bookmark",
            ),
            # 書のお気に入り: 同一ユーザー・同一書（章・節なし）の重複を禁止。
            models.UniqueConstraint(
                fields=["user", "canonical_book"],
                condition=models.Q(canonical_book__isnull=False)
                & models.Q(chapter_number__isnull=True)
                & models.Q(verse_number__isnull=True),
                name="unique_user_book_bookmark",
            ),
            # 各お気に入りは「コメントのお気に入り」「翻訳プロジェクトのお気に入り」「箇所のお気に入り」のいずれか1種のみ。
            # 箇所のお気に入りは canonical_book 必須で、節があれば章も必須（書→章→節の入れ子）。
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
