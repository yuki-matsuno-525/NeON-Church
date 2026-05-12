from django.conf import settings
from django.db import models

from common.models import BaseModel

# 論理削除済みコメントをフロントエンドに表示する際のプレースホルダー文字列。
# serializers.py・bookmarks/serializers.py・notifications/serializers.py で共用する。
DELETED_COMMENT_BODY = "このコメントは削除されました"

PREDEFINED_TAGS = [
    ("感想", "感想"),
    ("解説", "解説"),
    ("証し", "証し"),
    ("祈り", "祈り"),
    ("考察", "考察"),
]


class Tag(models.Model):
    name = models.CharField(max_length=20, unique=True)

    class Meta:
        db_table = "comment_tags"

    def __str__(self) -> str:
        return self.name


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
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    chapter = models.ForeignKey(
        "bible.Chapter",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    book = models.ForeignKey(
        "bible.Book",
        null=True,
        blank=True,
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
    # Q&A のベストアンサーとして選ばれた返信コメント。
    best_answer = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="best_answer_for",
    )
    body = models.TextField(max_length=5000)
    is_qa = models.BooleanField(default=False, db_index=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name="comments")

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


class Report(BaseModel):
    """
    コメントへの通報。1ユーザー1コメント1件（unique_constraint で重複防止）。
    管理者が Admin 画面で確認し、必要に応じて対象コメントを論理削除する。
    """

    SPAM = "spam"
    OFFENSIVE = "offensive"
    MISINFORMATION = "misinformation"
    OTHER = "other"
    REASON_CHOICES = [
        (SPAM, "スパム"),
        (OFFENSIVE, "不快なコンテンツ"),
        (MISINFORMATION, "誤情報"),
        (OTHER, "その他"),
    ]

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)

    class Meta:
        db_table = "reports"
        constraints = [
            models.UniqueConstraint(fields=["reporter", "comment"], name="unique_reporter_comment_report"),
        ]
