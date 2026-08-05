"""読書計画の読み出し。

書き込みは services.py。
"""

from django.db.models import Count, Q, QuerySet

from .models import Plan, PlanDay, PlanDayProgress, PlanSubscription

# 「今この計画を読んでいる人」の数。一覧・詳細の両方に出す。
_ACTIVE_READERS = Count("subscriptions", filter=Q(subscriptions__is_active=True))


def list_plans(user, *, mine: bool = False) -> QuerySet:
    """一覧。既定は公開のみ。mine=True なら自分のもの（下書き含む）。"""
    if mine and user.is_authenticated:
        queryset = Plan.objects.filter(owner=user)
    else:
        queryset = Plan.objects.filter(visibility=Plan.VISIBILITY_PUBLIC)
    return (
        queryset.select_related("owner")
        .annotate(active_reader_count=_ACTIVE_READERS)
        .order_by("-created_at")
        .prefetch_related("days")
    )


def plans_with_days() -> QuerySet:
    """詳細取得用。日と、その日に読む章まで先読みする。"""
    return (
        Plan.objects.select_related("owner")
        .annotate(active_reader_count=_ACTIVE_READERS)
        .prefetch_related("days__readings__canonical_book")
    )


def owned_days(user) -> QuerySet:
    """自分が書いた計画の日。他人の計画の日は最初から見えない。"""
    return PlanDay.objects.filter(plan__owner=user).prefetch_related("readings__canonical_book")


def subscription_for(user, plan: Plan) -> PlanSubscription | None:
    """その人がこの計画を読んでいるか。読んでいなければ None。"""
    if not user.is_authenticated:
        return None
    return PlanSubscription.objects.filter(user=user, plan=plan).first()


def completed_day_ids(subscription: PlanSubscription | None) -> set | None:
    """読み終えた日の id。購読していなければ None（「未購読」と「0日」を区別する）。"""
    if subscription is None:
        return None
    return set(
        PlanDayProgress.objects.filter(subscription=subscription).values_list("day_id", flat=True)
    )


def active_subscriptions(user) -> QuerySet:
    """自分が今読んでいる計画。"""
    return PlanSubscription.objects.filter(user=user, is_active=True).select_related("plan")
