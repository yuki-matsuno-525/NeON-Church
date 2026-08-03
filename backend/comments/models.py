from django.conf import settings
from django.db import models

from common.models import BaseModel

# 削除状態は is_deleted で返し、表示文言はクライアントの言語で決める。
DELETED_COMMENT_BODY = ""

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

    Q&A の質問・回答はここには入らない（qa.Question / qa.Answer が持つ）。
    論理削除時は body をクリアし、クライアント側で is_deleted に応じた文言を表示する。
    物理削除は行わない（子コメントの親参照を維持するため）。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    # 段階6F: 旧 verse/chapter/book FK は撤去。コメントの箇所は訳非依存の
    # canonical_book / chapter_number / verse_number で表す（粒度は null の組合せ）。
    # 作成 API の入力は verse_id/chapter_id/book_id のままだが、それは箇所を引くための入力で
    # あって保存はしない（serializer で箇所へ導出）。
    canonical_book = models.ForeignKey(
        "bible.CanonicalBook",
        on_delete=models.PROTECT,
        related_name="comments",
        null=True,
        blank=True,
    )
    chapter_number = models.PositiveSmallIntegerField(null=True, blank=True)
    verse_number = models.PositiveSmallIntegerField(null=True, blank=True)
    # 投稿時に表示していた聖書訳（Book.translation の値）のスナップショット。
    # version_label 生成用の恒久的な補助情報で、6F 後も残す。コメントの同一性・スレッド分割・
    # 一意制約・親子の同一ターゲット判定には使わない。NULL でもコメントは成立する。
    source_translation = models.CharField(max_length=50, null=True, blank=True)
    # どの翻訳プロジェクト向けのコメントか。null の場合は聖書本体（原文バージョン）への
    # コメント。値がある場合は、その翻訳プロジェクト専用のコメントとして分離される。
    # verse / chapter / book は翻訳の元になった聖書の節・章・書を指す。
    translation_project = models.ForeignKey(
        "translations.TranslationProject",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="bible_comments",
        db_index=True,
    )
    # 返信先コメント。null の場合はトップレベルコメント。
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    body = models.TextField(max_length=5000)
    is_deleted = models.BooleanField(default=False, db_index=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name="comments")

    class Meta:
        db_table = "comments"
        ordering = ["-created_at"]
        indexes = [
            # 読書画面は「この箇所のコメント」を新しい順に引く。chapter_number /
            # verse_number は一番よく使う絞り込み列なのに索引が無く、人気のある書ほど
            # そのコメント全体を走査していた。
            models.Index(
                fields=["canonical_book", "chapter_number", "verse_number", "-created_at"],
                name="comment_location_recent_idx",
            ),
            # 返信の読み足しは親でぶら下がりを引く。
            models.Index(fields=["parent", "-created_at"], name="comment_replies_recent_idx"),
        ]
        constraints = [
            # 段階6E: すべてのコメントは書・章・節のいずれかの粒度を必ず持つ。
            # canonical_book は必須。粒度は (章NULL・節NULL=書) / (章あり・節NULL=章) /
            # (章あり・節あり=節) のみ許可し、章NULLで節だけある等の中途半端を禁止する。
            models.CheckConstraint(
                condition=(
                    models.Q(canonical_book__isnull=False)
                    & ~(
                        models.Q(chapter_number__isnull=True) & models.Q(verse_number__isnull=False)
                    )
                ),
                name="comment_location_grain_valid",
            ),
        ]


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
    投稿への通報。1ユーザー1投稿1件（unique_constraint で重複防止）。
    管理者が Admin 画面で確認し、必要に応じて対象を論理削除する。

    通報できるのはコメント・Q&A の質問・Q&A の回答の3種類。1件の通報が指すのは
    そのうち1つだけ（report_has_exactly_one_target で保証）。
    """

    SPAM = "spam"
    OFFENSIVE = "offensive"
    MISINFORMATION = "misinformation"
    OTHER = "other"
    REASON_CHOICES = [
        (SPAM, "Spam"),
        (OFFENSIVE, "Offensive content"),
        (MISINFORMATION, "Misinformation"),
        (OTHER, "Other"),
    ]

    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    comment = models.ForeignKey(
        Comment,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    question = models.ForeignKey(
        "qa.Question",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    answer = models.ForeignKey(
        "qa.Answer",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="reports",
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)

    class Meta:
        db_table = "reports"
        constraints = [
            # 同じ人が同じ対象を二重に通報できないようにする。対象ごとに別の制約を張るのは、
            # NULL 同士は等しくないと扱われるため（3列まとめた1つの制約では効かない）。
            models.UniqueConstraint(
                fields=["reporter", "comment"],
                condition=models.Q(comment__isnull=False),
                name="unique_reporter_comment_report",
            ),
            models.UniqueConstraint(
                fields=["reporter", "question"],
                condition=models.Q(question__isnull=False),
                name="unique_reporter_question_report",
            ),
            models.UniqueConstraint(
                fields=["reporter", "answer"],
                condition=models.Q(answer__isnull=False),
                name="unique_reporter_answer_report",
            ),
            # 通報の対象はちょうど1つ。
            models.CheckConstraint(
                condition=(
                    models.Q(comment__isnull=False, question__isnull=True, answer__isnull=True)
                    | models.Q(comment__isnull=True, question__isnull=False, answer__isnull=True)
                    | models.Q(comment__isnull=True, question__isnull=True, answer__isnull=False)
                ),
                name="report_has_exactly_one_target",
            ),
        ]
