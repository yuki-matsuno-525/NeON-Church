"""通知の読み出し。

「自分宛て」かつ「見える企画のもの」に絞る規則がここに集まる。
通知を作る側は services.py（send_user_notification）。
"""

from django.db.models import Count, Q, QuerySet

from translations.access import filter_by_project_visibility

from .models import Notification

# 通知から元の箇所へ飛ぶために必要な関連。
#
# 返信の返信からでも辿れるよう親を2段まで先読みする（これより深いときだけ
# 追加で辿る）。canonical_book は書名の引き当てに使う。
_LIST_RELATED = (
    "actor",
    "comment",
    "comment__canonical_book",
    "comment__translation_project",
    "comment__parent",
    "comment__parent__parent",
    "translation_comment",
    "translation_comment__project",
    "answer",
    "answer__question",
)


def visible_notifications(user) -> QuerySet:
    """自分宛ての通知のうち、紐づく企画が見えるものだけ。

    見えない企画のコメントへの通知は、件数からも存在を悟られないよう
    この段階で落とす。
    """
    return filter_by_project_visibility(
        Notification.objects.filter(recipient=user),
        user,
        "comment__translation_project",
        "translation_comment__project",
    )


def base_notifications(user, *, unread_only: bool = False) -> QuerySet:
    """種類で絞る前の通知。件数の集計にも使う。"""
    qs = visible_notifications(user)
    if unread_only:
        return qs.filter(is_read=False)
    return qs


def list_notifications(user, params) -> QuerySet:
    """一覧。未知の種類は無視して全件（＝「すべて」タブ）にする。"""
    qs = base_notifications(user, unread_only=params.get("unread") == "1").select_related(
        *_LIST_RELATED
    )
    target_type = params.get("type")
    if target_type in dict(Notification.TYPE_CHOICES):
        return qs.filter(notification_type=target_type)
    return qs


def counts_by_type(queryset: QuerySet) -> dict:
    """タブに出す種類ごとの件数。

    返信・高評価・メンションが1本に混ざると、数の多い高評価に返信が埋もれる。
    画面はタブで切り替えるので、その数をここで用意する。
    """
    return queryset.aggregate(
        all=Count("id"),
        **{
            name: Count("id", filter=Q(notification_type=name))
            for name, _label in Notification.TYPE_CHOICES
        },
    )


def unread_count(user) -> int:
    """未読件数だけを軽量に数える。"""
    return base_notifications(user, unread_only=True).count()
