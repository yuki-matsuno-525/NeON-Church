"""
読んだ印の計算。

印は章ごとに付ける（PlanReadingProgress）。「その日を読み終えた」（PlanDayProgress）は
そこから導かれるもので、直接は付けない。日の完了を別に持っているのは、
「読んでいるプラン」の一覧が「何日中いくつ終わったか」を数えるため。
一覧のたびに全部の章を数え直すと重いので、印を付け外しするその瞬間に一度だけ計算して置く。
"""

from django.db.models import Count

from .models import PlanDay, PlanDayProgress, PlanReadingProgress, PlanSubscription


def sync_day_progress(subscription: PlanSubscription, day: PlanDay) -> None:
    """
    1人ぶん。その日の章に全部印が付いていれば日の完了を作り、1つでも欠けたら消す。

    章が1つも無い日は完了にできない。読むものが無いのだから、読み終えようがないため。
    """
    reading_ids = set(day.readings.values_list("id", flat=True))
    done_ids = set(
        PlanReadingProgress.objects.filter(
            subscription=subscription, reading_id__in=reading_ids
        ).values_list("reading_id", flat=True)
    )
    if reading_ids and done_ids >= reading_ids:
        PlanDayProgress.objects.get_or_create(subscription=subscription, day=day)
    else:
        PlanDayProgress.objects.filter(subscription=subscription, day=day).delete()


def resync_day_progress_for_all_readers(day: PlanDay) -> None:
    """
    読んでいる人ぜんぶぶん。書いた人がその日の章を足したり外したりしたあとに呼ぶ。

    これが無いと、完了済みの日に章が1つ足されたとき、章の印は欠けているのに
    日は完了のままになる。人数ぶん問い合わせずに済むよう、まとめて数える。
    """
    reading_ids = list(day.readings.values_list("id", flat=True))
    if not reading_ids:
        PlanDayProgress.objects.filter(day=day).delete()
        return

    # 「その人がこの日の章にいくつ印を付けたか」を1回で数える。
    counted = (
        PlanReadingProgress.objects.filter(reading_id__in=reading_ids)
        .values("subscription_id")
        .annotate(done=Count("id"))
    )
    completed_ids = [row["subscription_id"] for row in counted if row["done"] >= len(reading_ids)]

    PlanDayProgress.objects.filter(day=day).exclude(subscription_id__in=completed_ids).delete()
    already = set(PlanDayProgress.objects.filter(day=day).values_list("subscription_id", flat=True))
    PlanDayProgress.objects.bulk_create(
        [
            PlanDayProgress(subscription_id=subscription_id, day=day)
            for subscription_id in completed_ids
            if subscription_id not in already
        ]
    )
