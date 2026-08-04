"""コメントの書き込み。

投票・通報・論理削除と、それに伴う通知をここに集める。
読み出しは selectors.py。
"""

from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound

from common.exceptions import BadRequest, Conflict
from translations.access import can_view_project_work, get_visible_project_or_404

from .models import Comment, Report, Vote


def resolve_visible_targets(user, data) -> None:
    """投稿先の企画・親コメントを、シリアライザの検証より先に解決する。

    見えないものと存在しないものを同じ 404 に見せるため（検証エラーとの
    違いから「その id は実在する」と当てられないようにする）。
    """
    from .selectors import get_visible_comment_or_404

    project_id = data.get("translation_project")
    if project_id:
        get_visible_project_or_404(user, project_id)
    parent_id = data.get("parent")
    if parent_id:
        get_visible_comment_or_404(user, pk=parent_id)


def scope_project(validated_data):
    """このコメントが属する企画。返信なら親に合わせる。"""
    parent = validated_data.get("parent")
    if parent and parent.translation_project_id:
        return parent.translation_project
    return validated_data.get("translation_project")


def notify_reply(comment: Comment) -> None:
    """返信されたことを親の書き手に知らせる。自分への返信は出さない。"""
    if not comment.parent:
        return
    notify(
        recipient=comment.parent.user,
        actor=comment.user,
        notification_type="reply",
        comment=comment,
    )


def notify(recipient, actor, notification_type, comment) -> None:
    """通知を作る。送り方（画面内・メール）は受け取る人の設定に従う。"""
    from notifications.services import send_user_notification

    send_user_notification(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        comment=comment,
    )


# ---------------------------------------------------------------------------
# 高評価
# ---------------------------------------------------------------------------


def add_vote(user, comment: Comment) -> None:
    """高評価を付ける。二度目は 409。付けた相手に通知する。"""
    _, created = Vote.objects.get_or_create(user=user, comment=comment)
    if not created:
        raise Conflict("Already voted.")
    notify(
        recipient=comment.user,
        actor=user,
        notification_type="upvote",
        comment=comment,
    )


def remove_vote(user, comment: Comment) -> None:
    """高評価を外す。付けていなければ 404。"""
    deleted_count, _ = Vote.objects.filter(user=user, comment=comment).delete()
    if not deleted_count:
        # Django の Http404 だと DRF が文言を捨てて "Not found." にしてしまう。
        raise NotFound("Vote not found.")


# ---------------------------------------------------------------------------
# 通報とモデレーション
# ---------------------------------------------------------------------------


def report(user, comment: Comment, reason: str) -> None:
    """通報する。自分の投稿は通報できない。同じ相手への二度目は 409。"""
    if comment.user == user:
        raise BadRequest("Cannot report your own comment.")
    _, created = Report.objects.get_or_create(
        reporter=user,
        comment=comment,
        defaults={"reason": reason},
    )
    if not created:
        raise Conflict("Already reported.")


def moderate(comment_id) -> None:
    """管理者による強制削除（冪等）。行は残して本文だけ隠す。"""
    comment = get_object_or_404(Comment, pk=comment_id)
    if not comment.is_deleted:
        comment.is_deleted = True
        comment.save(update_fields=["is_deleted", "updated_at"])


def soft_delete(comment: Comment) -> None:
    """自分のコメントを消す。返信のぶら下がり先を残すため行は消さない。"""
    comment.is_deleted = True
    comment.save(update_fields=["is_deleted", "updated_at"])


def ensure_editable(comment: Comment) -> None:
    """削除済みのコメントは編集させない。"""
    if comment.is_deleted:
        raise BadRequest("Cannot edit a deleted comment.")


def check_scope_visible(user, project) -> None:
    """投稿先の企画が見えるか、保存の直前にもう一度確かめる。"""
    if project and not can_view_project_work(user, project):
        raise Http404
