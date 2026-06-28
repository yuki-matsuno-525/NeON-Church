from django.conf import settings
from django.db import models

from common.models import BaseModel


class Language(BaseModel):
    """翻訳先言語の選択肢。DBで管理することで動的に追加・削除できる。"""

    tag = models.CharField(max_length=20, unique=True)
    label = models.CharField(max_length=100)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "translation_languages"
        ordering = ["order"]

    def __str__(self) -> str:
        return self.label


class TranslationProject(BaseModel):
    """
    共同翻訳プロジェクト。
    source_book で翻訳対象の書を指定する。
    status: draft（非公開）→ active（参加者募集中）→ published（公開済み）
    """

    STATUS_DRAFT = "draft"
    STATUS_ACTIVE = "active"
    STATUS_PUBLISHED = "published"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "下書き"),
        (STATUS_ACTIVE, "進行中"),
        (STATUS_PUBLISHED, "公開済み"),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_translation_projects",
    )
    source_book = models.ForeignKey(
        "bible.Book",
        on_delete=models.PROTECT,
        related_name="translation_projects",
    )

    target_language = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)

    class Meta:
        db_table = "translation_projects"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class TranslationMembership(BaseModel):
    """
    プロジェクトへの参加申請・承認状態。
    オーナーは作成時に role=owner, status=approved で自動登録される。
    """

    ROLE_OWNER = "owner"
    ROLE_MEMBER = "member"
    ROLE_CHOICES = [
        (ROLE_OWNER, "オーナー"),
        (ROLE_MEMBER, "メンバー"),
    ]

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CHOICES = [
        (STATUS_PENDING, "承認待ち"),
        (STATUS_APPROVED, "承認済み"),
        (STATUS_REJECTED, "拒否"),
    ]

    project = models.ForeignKey(
        TranslationProject,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="translation_memberships",
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)

    class Meta:
        db_table = "translation_memberships"
        constraints = [
            models.UniqueConstraint(fields=["project", "user"], name="unique_project_user_membership"),
        ]

    def __str__(self) -> str:
        return f"{self.project.name} - {self.user.username} ({self.role})"


class TranslationUnit(BaseModel):
    """
    翻訳の1ユニット（節単位）。
    status: todo → in_progress（担当者が着手）→ review（提出）→ done（オーナー承認）
    """

    STATUS_TODO = "todo"
    STATUS_IN_PROGRESS = "in_progress"
    STATUS_REVIEW = "review"
    STATUS_DONE = "done"
    STATUS_CHOICES = [
        (STATUS_TODO, "未着手"),
        (STATUS_IN_PROGRESS, "進行中"),
        (STATUS_REVIEW, "レビュー中"),
        (STATUS_DONE, "完了"),
    ]

    project = models.ForeignKey(
        TranslationProject,
        on_delete=models.CASCADE,
        related_name="units",
    )
    verse = models.ForeignKey(
        "bible.Verse",
        on_delete=models.PROTECT,
        related_name="translation_units",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_translation_units",
    )
    body = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TODO, db_index=True)

    class Meta:
        db_table = "translation_units"
        constraints = [
            models.UniqueConstraint(fields=["project", "verse"], name="unique_project_verse_unit"),
        ]
        ordering = ["verse__chapter__number", "verse__number"]

    def __str__(self) -> str:
        return f"{self.project.name} - {self.verse}"


class TranslationLibraryEntry(BaseModel):
    """
    ユーザーが公開翻訳を自分の /read に追加した本棚エントリ。
    公開（published）プロジェクトのみ追加でき、追加した本人の /read にのみ表示される。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="translation_library",
    )
    project = models.ForeignKey(
        TranslationProject,
        on_delete=models.CASCADE,
        related_name="library_entries",
    )

    class Meta:
        db_table = "translation_library_entries"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "project"], name="unique_user_project_library"),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} → {self.project.name}"


class TranslationComment(BaseModel):
    """
    翻訳プロジェクトの議論コメント（フラット構造）。
    unit が null の場合はプロジェクト全体への投稿。
    """

    project = models.ForeignKey(
        TranslationProject,
        on_delete=models.CASCADE,
        related_name="t_comments",
    )
    unit = models.ForeignKey(
        TranslationUnit,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="t_comments",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="translation_comments",
    )
    body = models.TextField()
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "translation_comments"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.project.name} comment by {self.user.username}"
