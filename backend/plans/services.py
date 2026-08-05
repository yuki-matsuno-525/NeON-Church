"""読書計画の書き込み。

「読み始めた人がいるかどうか」で許される操作が変わるのがこのアプリの肝。
中身の書き換えは読者がいてもできるが、日の増減・並べ替えはできない。
読んだ記録は「第N日」に紐づくので、中身が変わっても記録は壊れないが、
番号がずれると壊れるため。

読み出しは selectors.py。
"""

from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404

from common.exceptions import BadRequest

from .models import Plan, PlanDay, PlanDayProgress, PlanSubscription


def get_owned_plan(user, plan_id) -> Plan:
    """書いた人だけが触れる計画を取り出す。他人なら 404（存在自体を伏せる）。"""
    return get_object_or_404(Plan, pk=plan_id, owner=user)


def readable_plan(user, plan_id) -> Plan:
    """読んでよい計画を取り出す。下書きは書いた人だけ。"""
    from django.db.models import Q

    visible = Q(visibility__in=[Plan.VISIBILITY_PUBLIC, Plan.VISIBILITY_UNLISTED])
    if user.is_authenticated:
        visible |= Q(owner=user)
    return get_object_or_404(Plan.objects.filter(visible), pk=plan_id)


# ---------------------------------------------------------------------------
# 日
# ---------------------------------------------------------------------------


def append_day(plan: Plan, *, title: str = "", devotional: str = "") -> PlanDay:
    """日を末尾に足す。

    足すのはいつでもできる。読んでいる人の進捗は「第N日」に紐づいているので、
    後ろに足すぶんには何もずれないため。
    """
    with transaction.atomic():
        last = plan.days.aggregate(Max("number"))["number__max"] or 0
        return PlanDay.objects.create(
            plan=plan,
            number=last + 1,
            title=title,
            devotional=devotional,
        )


def delete_day(day: PlanDay) -> None:
    """日を消して、残りの番号を詰める。読者がいるあいだは消せない。"""
    if day.plan.has_readers:
        raise BadRequest("読み始めた人がいるので、日は消せません。中身は直せます。")

    with transaction.atomic():
        plan = day.plan
        day.delete()
        # 残った日の番号を詰める（1,2,3… の連番を保つ）。
        for index, remaining in enumerate(plan.days.order_by("number"), start=1):
            if remaining.number != index:
                remaining.number = index
                remaining.save(update_fields=["number", "updated_at"])


def reorder_days(plan: Plan, day_ids: list) -> None:
    """日を並べ替える。読者がいるあいだはできない（第N日がずれるため）。"""
    if plan.has_readers:
        raise BadRequest("読み始めた人がいるので、日の並びは変えられません。")

    days = {str(day.id): day for day in plan.days.all()}
    if set(day_ids) != set(days.keys()):
        raise BadRequest("すべての日を並べ替えの指定に入れてください。")

    with transaction.atomic():
        # 一意制約に引っかからないよう、いったん重ならない番号へ逃がしてから振り直す。
        for offset, day_id in enumerate(day_ids, start=1):
            day = days[day_id]
            day.number = offset + len(day_ids)
            day.save(update_fields=["number", "updated_at"])
        for index, day_id in enumerate(day_ids, start=1):
            day = days[day_id]
            day.number = index
            day.save(update_fields=["number", "updated_at"])


# ---------------------------------------------------------------------------
# 購読と進捗
# ---------------------------------------------------------------------------


def subscribe(user, plan: Plan) -> tuple[PlanSubscription, bool]:
    """読み始める。やめていた人は読み直しになる。返り値の bool は新規かどうか。"""
    subscription, created = PlanSubscription.objects.get_or_create(user=user, plan=plan)
    if not created and not subscription.is_active:
        subscription.is_active = True
        subscription.save(update_fields=["is_active", "updated_at"])
    return subscription, created


def unsubscribe(user, plan_id) -> None:
    """やめる。読んだ記録は残す（読み直したときに続きから見えるように）。"""
    subscription = get_object_or_404(PlanSubscription, user=user, plan_id=plan_id)
    subscription.is_active = False
    subscription.save(update_fields=["is_active", "updated_at"])


def restart(user, plan_id) -> PlanSubscription:
    """最初からやり直す。読んだ記録を消して、今日から数え直す。"""
    subscription = get_object_or_404(PlanSubscription, user=user, plan_id=plan_id)
    with transaction.atomic():
        subscription.progress.all().delete()
        # started_at は auto_now_add なので、数え直すには作り直すしかない。
        subscription.delete()
        return PlanSubscription.objects.create(user=user, plan_id=plan_id, is_active=True)


def _active_subscription(user, plan_id) -> PlanSubscription:
    return get_object_or_404(PlanSubscription, user=user, plan_id=plan_id, is_active=True)


def mark_day_complete(user, plan_id, day_id) -> None:
    """その日を読み終えた印をつける（冪等）。"""
    subscription = _active_subscription(user, plan_id)
    day = get_object_or_404(PlanDay, pk=day_id, plan_id=plan_id)
    PlanDayProgress.objects.get_or_create(subscription=subscription, day=day)


def unmark_day_complete(user, plan_id, day_id) -> None:
    """印を外す（冪等）。"""
    subscription = _active_subscription(user, plan_id)
    PlanDayProgress.objects.filter(subscription=subscription, day_id=day_id).delete()
