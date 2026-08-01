from django.conf import settings
from django.db import models

from common.models import BaseModel

# 1日にまとめて読ませる章の数の上限。多すぎると1日で終わらなくなる。
MAX_READINGS_PER_DAY = 10
# プランの長さの上限。1年通読ができる長さ。
MAX_DAYS_PER_PLAN = 365


class Plan(BaseModel):
    """
    読書プラン。章を書をまたいで並べ、日ごとに書いた人の文章（devotional）を添える読書コース。

    「創世記1章 → エノク書6章 → トマス福音書」のように、正典と外典を横断して
    並べられることがこの機能の要。章の指定は訳に依らない書（CanonicalBook）で持つので、
    読む人は自分の使っている訳で読める。
    """

    VISIBILITY_PRIVATE = "private"
    VISIBILITY_UNLISTED = "unlisted"
    VISIBILITY_PUBLIC = "public"
    VISIBILITY_CHOICES = [
        (VISIBILITY_PRIVATE, "Private"),
        (VISIBILITY_UNLISTED, "Unlisted"),
        (VISIBILITY_PUBLIC, "Public"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plans",
    )
    title = models.CharField(max_length=200)
    description = models.CharField(max_length=300, blank=True)
    # 書いた人からの注記。日の並びを凍結したあとも、ここだけはいつでも書き換えられる。
    # 「第5日と第6日を入れ違えました」のような訂正を置く場所。
    note = models.TextField(blank=True)
    visibility = models.CharField(
        max_length=12,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PRIVATE,
        db_index=True,
    )

    class Meta:
        db_table = "plans"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title

    @property
    def has_readers(self) -> bool:
        """誰かが読み始めているか。始まっていたら日の並びを変えられなくなる。"""
        return self.subscriptions.exists()


class PlanDay(BaseModel):
    """プランの1日ぶん。読む章（PlanDayReading）と、書いた人の文章を持つ。"""

    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="days")
    # 第N日。読んだかどうかの記録はこの番号に紐づくので、公開後は入れ替えない。
    number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200, blank=True)
    devotional = models.TextField(blank=True)

    class Meta:
        db_table = "plan_days"
        ordering = ["number"]
        constraints = [
            models.UniqueConstraint(fields=["plan", "number"], name="unique_plan_day_number"),
        ]

    def __str__(self) -> str:
        return f"{self.plan.title} 第{self.number}日"


class PlanDayReading(BaseModel):
    """その日に読む章を1つ。訳非依存の書＋章番号で持つ。"""

    day = models.ForeignKey(PlanDay, on_delete=models.CASCADE, related_name="readings")
    canonical_book = models.ForeignKey(
        "bible.CanonicalBook",
        on_delete=models.PROTECT,
        related_name="plan_readings",
    )
    chapter_number = models.PositiveSmallIntegerField()
    # 訳の指定（Book.translation の値）。空なら読む人の訳で開く。
    # あえてギリシャ語で読ませる日を作れるようにするための欄。
    translation = models.CharField(max_length=50, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "plan_day_readings"
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.canonical_book.slug} {self.chapter_number}"


class PlanSubscription(BaseModel):
    """
    その人がそのプランを読んでいる状態。1人1プランにつき1件。

    やめても行は消さず is_active を落とすだけにする。読み直したくなったときに
    同じ行を使い回せるようにするため。
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plan_subscriptions",
    )
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="subscriptions")
    # 始めた日。画面の「今日は3日目」はこの日から数える。
    started_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "plan_subscriptions"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["user", "plan"], name="unique_user_plan_subscription"),
        ]

    def __str__(self) -> str:
        return f"{self.user} → {self.plan.title}"


class PlanDayProgress(BaseModel):
    """その日を読み終えた印。連続日数などは持たない（数え始めると沼なので）。"""

    subscription = models.ForeignKey(
        PlanSubscription,
        on_delete=models.CASCADE,
        related_name="progress",
    )
    day = models.ForeignKey(PlanDay, on_delete=models.CASCADE, related_name="progress")

    class Meta:
        db_table = "plan_day_progress"
        constraints = [
            models.UniqueConstraint(
                fields=["subscription", "day"], name="unique_subscription_day_progress"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.subscription} 第{self.day.number}日"
