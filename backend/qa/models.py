from django.conf import settings
from django.db import models

from common.models import BaseModel

# 削除状態は is_deleted で返し、表示文言はクライアントの言語で決める。
DELETED_BODY = ""


class Question(BaseModel):
    """
    Q&A の質問。

    コメント（comments.Comment）とは別のデータにしてある。質問はタイトルを持ち、
    解決済みかどうかという状態を持ち、回答の中から1つをベストアンサーに選べる。
    コメントはそのどれも要らない。混ぜるとお互いに使わない列を持ち合うことになるので分けた。

    箇所は訳非依存で持つ（canonical_book + 章番号 + 節番号）。コメント・栞・記事と
    まったく同じ形なので、口語訳で立てた質問を KJV を読みながら見つけられる。
    粒度は「書」「章」「節」のいずれか（章 NULL で節だけ、は CHECK で禁止）。

    物理削除は行わない（回答の親参照を維持するため）。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="questions",
    )
    canonical_book = models.ForeignKey(
        "bible.CanonicalBook",
        on_delete=models.PROTECT,
        related_name="questions",
    )
    chapter_number = models.PositiveSmallIntegerField(null=True, blank=True)
    verse_number = models.PositiveSmallIntegerField(null=True, blank=True)
    # 投稿時に表示していた聖書訳（Book.translation の値）のスナップショット。
    # 書名をどの訳の呼び名で出すかにだけ使う補助情報で、箇所の同一性には関わらない。
    source_translation = models.CharField(max_length=50, null=True, blank=True)
    title = models.CharField(max_length=200)
    body = models.TextField(max_length=5000)
    # ベストアンサーに選ばれた回答。これが入っていれば「解決済み」。
    best_answer = models.ForeignKey(
        "Answer",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="best_answer_for",
    )
    tags = models.ManyToManyField("comments.Tag", blank=True, related_name="questions")
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "qa_questions"
        ordering = ["-created_at"]
        indexes = [
            # 一覧は新しい順。未解決／解決済みの2列に分けるので best_answer でも絞る。
            models.Index(fields=["best_answer", "-created_at"], name="qa_question_answered_idx"),
            # 読書ページの Q&A タブは「この箇所の質問」を新しい順に引く。
            models.Index(
                fields=["canonical_book", "chapter_number", "verse_number", "-created_at"],
                name="qa_question_location_idx",
            ),
        ]
        constraints = [
            # 粒度は (章NULL・節NULL=書) / (章あり・節NULL=章) / (章あり・節あり=節) のみ。
            # 章NULLで節だけある、という中途半端な状態を禁止する。
            models.CheckConstraint(
                condition=~(
                    models.Q(chapter_number__isnull=True)
                    & models.Q(verse_number__isnull=False)
                ),
                name="qa_question_location_grain_valid",
            ),
        ]

    def __str__(self) -> str:
        return self.title


class Answer(BaseModel):
    """
    Q&A の回答。

    ネストしない（回答への返信は作らない）。議論が続くならコメント欄でやればよく、
    Q&A は「質問 → 回答が並ぶ」形に保つ。

    物理削除は行わない（ベストアンサーの参照や表示順を壊さないため）。
    """

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="answers",
    )
    body = models.TextField(max_length=5000)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "qa_answers"
        # 回答は古い順に並べる。議論の流れを上から追えるようにするため
        # （コメントの「新しい順」とは意図的に違う）。
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["question", "created_at"], name="qa_answer_question_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.question.title} への回答"
