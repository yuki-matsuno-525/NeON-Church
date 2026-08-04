"""翻訳企画の「書き込み」。

状態を変える操作はここに集める。ビューは入力を解いてここを呼び、
返ってきたものをシリアライズするだけにする。

規則に反する入力は例外で伝える（common.exceptions 参照）。DRF が
`{"detail": "..."}` の形へ翻訳するので、ビューで分岐を書く必要はない。

読み出しは selectors.py。
"""

import re

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from common.exceptions import BadRequest
from notifications.models import Notification
from notifications.services import send_user_notification

from .models import (
    TranslationComment,
    TranslationLibraryEntry,
    TranslationMembership,
    TranslationProject,
    TranslationUnit,
)

User = get_user_model()

# コメント本文の @username。半角英数と _ を名前として拾う。
_MENTION_RE = re.compile(r"@([\w]+)")


# ---------------------------------------------------------------------------
# 企画
# ---------------------------------------------------------------------------


def register_owner_membership(project: TranslationProject) -> TranslationMembership:
    """作った人を承認済みのオーナーとしてメンバーに入れる。

    作成直後にこれを通さないと、持ち主が自分の企画で作業できない。
    """
    return TranslationMembership.objects.create(
        project=project,
        user=project.owner,
        role=TranslationMembership.ROLE_OWNER,
        status=TranslationMembership.STATUS_APPROVED,
    )


def set_project_status(project: TranslationProject, new_status: str) -> TranslationProject:
    """公開・公開取り消し・募集開始で共通の遷移。オーナー確認は呼び出し側の権限クラス。"""
    project.status = new_status
    project.save(update_fields=["status", "updated_at"])
    return project


# ---------------------------------------------------------------------------
# メンバーシップ
# ---------------------------------------------------------------------------


def apply_to_project(project: TranslationProject, user) -> TranslationMembership:
    """参加を申し込む。

    一度断られた人は申し込み直せる（status を pending に戻す）。
    申請中・承認済みの人が重ねて押した場合はエラーにする。
    """
    if project.status != TranslationProject.STATUS_ACTIVE:
        raise BadRequest("This project is not accepting applications.")

    membership, created = TranslationMembership.objects.get_or_create(
        project=project,
        user=user,
        defaults={
            "role": TranslationMembership.ROLE_MEMBER,
            "status": TranslationMembership.STATUS_PENDING,
        },
    )
    if created:
        return membership

    if membership.status != TranslationMembership.STATUS_REJECTED:
        raise BadRequest("Already applied.")
    membership.status = TranslationMembership.STATUS_PENDING
    membership.save(update_fields=["status", "updated_at"])
    return membership


def decide_membership(project_id, membership_id, new_status: str) -> TranslationMembership:
    """参加申請を承認または拒否する。"""
    if new_status not in (
        TranslationMembership.STATUS_APPROVED,
        TranslationMembership.STATUS_REJECTED,
    ):
        raise BadRequest('status must be "approved" or "rejected".')

    membership = get_object_or_404(TranslationMembership, pk=membership_id, project_id=project_id)
    membership.status = new_status
    membership.save(update_fields=["status"])
    return membership


def remove_member(project_id, membership_id) -> None:
    """メンバーを外す。オーナー自身は role で弾かれるので外れない。"""
    membership = get_object_or_404(
        TranslationMembership,
        pk=membership_id,
        project_id=project_id,
        role=TranslationMembership.ROLE_MEMBER,
    )
    membership.delete()


def require_owner(project: TranslationProject, user) -> TranslationProject:
    """持ち主でなければ 403。オーナー限定の操作の入口で使う。"""
    if project.owner_id != getattr(user, "id", None):
        raise PermissionDenied("Only the owner can perform this action.")
    return project


# ---------------------------------------------------------------------------
# ユニット
# ---------------------------------------------------------------------------


def assign_unit(project: TranslationProject, unit_id, user_id) -> TranslationUnit:
    """ユニットの担当者を決める。user_id が None なら担当を外す。"""
    unit = get_object_or_404(TranslationUnit, pk=unit_id, project=project)
    if user_id is None:
        unit.assigned_to = None
    else:
        if not TranslationMembership.objects.filter(
            project=project,
            user_id=user_id,
            status=TranslationMembership.STATUS_APPROVED,
        ).exists():
            raise BadRequest("Only approved members can be assigned.")
        unit.assigned_to_id = user_id
    unit.save(update_fields=["assigned_to", "updated_at"])
    return unit


def can_update_unit(unit: TranslationUnit, user) -> bool:
    """訳文を書き換えてよいのは、担当している承認済みメンバーか、持ち主。"""
    project = unit.project
    if project.owner_id == getattr(user, "id", None):
        return True
    if unit.assigned_to_id != getattr(user, "id", None):
        return False
    return TranslationMembership.objects.filter(
        project=project,
        user=user,
        status=TranslationMembership.STATUS_APPROVED,
    ).exists()


def add_book_units(project: TranslationProject, book) -> int:
    """書の全節をユニットとして足す。すでにあるぶんは飛ばす（冪等）。返り値は作った数。

    節ごとに get_or_create を回すと、詩篇（約2461節）で1リクエスト約5000クエリになる。
    しかも TranslationUnit の既定の並び順が verse__chapter__number なので、
    1件ごとに2段の JOIN が付いていた。
    「既にあるぶん」を1回で引き、足りないぶんだけまとめて作る（3クエリで済む）。
    values_list("id") で節そのものは読み込まない。
    """
    from bible.models import Verse

    verse_ids = set(Verse.objects.filter(chapter__book=book).values_list("id", flat=True))
    existing_ids = set(
        TranslationUnit.objects.filter(project=project, verse_id__in=verse_ids).values_list(
            "verse_id", flat=True
        )
    )
    missing_ids = verse_ids - existing_ids

    # 途中で落ちたときに中途半端なユニットが残らないよう、まとめて1つの処理にする。
    with transaction.atomic():
        TranslationUnit.objects.bulk_create(
            [TranslationUnit(project=project, verse_id=vid) for vid in missing_ids],
            ignore_conflicts=True,
        )
    return len(missing_ids)


def remove_book_units(project: TranslationProject, book) -> int:
    """書に属するユニットをまとめて消す。返り値は消した数。"""
    deleted, _ = TranslationUnit.objects.filter(project=project, verse__chapter__book=book).delete()
    return deleted


def resolve_book(book_id):
    """一括追加・削除の対象の書を引く。未指定は 400。"""
    from bible.models import Book

    if not book_id:
        raise BadRequest("book_id is required.")
    return get_object_or_404(Book, pk=book_id)


# ---------------------------------------------------------------------------
# コメント
# ---------------------------------------------------------------------------


def create_mention_notifications(comment: TranslationComment) -> None:
    """コメント本文の @username を解析して通知を作成する。自己メンションは無視。"""
    usernames = set(_MENTION_RE.findall(comment.body))
    if not usernames:
        return
    users = User.objects.filter(username__in=usernames).exclude(pk=comment.user_id)
    for user in users:
        send_user_notification(
            recipient=user,
            actor=comment.user,
            notification_type=Notification.MENTION,
            translation_comment=comment,
        )


def comment_target(project_id, unit_id=None) -> tuple[TranslationProject, TranslationUnit | None]:
    """コメントのぶら下がり先。unit_id が無ければ企画全体へのコメント。"""
    project = get_object_or_404(TranslationProject, pk=project_id)
    if not unit_id:
        return project, None
    return project, get_object_or_404(TranslationUnit, pk=unit_id, project=project)


def soft_delete_comment(project_id, comment_id, user) -> None:
    """コメントを論理削除する。消せるのは書いた人か持ち主。

    行ごと消さないのは、返信のぶら下がり先を残すため。本文は空にする。
    """
    comment = get_object_or_404(TranslationComment, pk=comment_id, project_id=project_id)
    if comment.user_id != user.id and comment.project.owner_id != user.id:
        raise PermissionDenied("Only the author or owner can delete.")
    comment.is_deleted = True
    comment.body = ""
    comment.save(update_fields=["is_deleted", "body", "updated_at"])


# ---------------------------------------------------------------------------
# 本棚
# ---------------------------------------------------------------------------


def add_to_library(user, project_id) -> TranslationProject:
    """公開済み企画を自分の /read に足す（冪等）。"""
    project = get_object_or_404(
        TranslationProject,
        pk=project_id,
        status=TranslationProject.STATUS_PUBLISHED,
    )
    TranslationLibraryEntry.objects.get_or_create(user=user, project=project)
    return project


def remove_from_library(user, project_id) -> None:
    """自分の /read から外す（冪等）。"""
    TranslationLibraryEntry.objects.filter(user=user, project_id=project_id).delete()
