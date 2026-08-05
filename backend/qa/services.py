"""Q&A の書き込み。読み出しは selectors.py。"""

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied

from common.exceptions import BadRequest, Conflict

from .models import Answer, Question


def soft_delete(instance) -> None:
    """質問・回答を消す。ぶら下がる回答やスレッドを残すため行は消さない。"""
    instance.is_deleted = True
    instance.save(update_fields=["is_deleted", "updated_at"])


def soft_delete_answer(answer: Answer) -> None:
    """回答を消す。ベストアンサーだったなら質問側の参照も外す。

    外さないと、中身の消えた回答が「解決済み」の見た目だけ残してしまう。
    """
    soft_delete(answer)
    if answer.best_answer_for.exists():
        Question.objects.filter(best_answer=answer).update(best_answer=None)


def ensure_editable(answer: Answer) -> None:
    """削除済みの回答は編集させない。"""
    if answer.is_deleted:
        raise BadRequest("Cannot edit a deleted answer.")


def notify_question_author(answer: Answer) -> None:
    """回答が付いたことを質問者に知らせる。自分で答えたときは出さない。

    送り方（画面内・メール）は受け取る人の設定に従うので、共通の仕組みに任せる。
    """
    from notifications.services import send_user_notification

    send_user_notification(
        recipient=answer.question.user,
        actor=answer.user,
        notification_type="reply",
        answer=answer,
    )


def report(user, model, pk, report_field: str, reason: str) -> None:
    """質問・回答を通報する。自分の投稿は通報できない。二度目は 409。"""
    from comments.models import Report

    target = get_object_or_404(model, pk=pk)
    if target.user == user:
        raise BadRequest("Cannot report your own post.")
    _, created = Report.objects.get_or_create(
        reporter=user,
        **{report_field: target},
        defaults={"reason": reason},
    )
    if not created:
        raise Conflict("Already reported.")


def set_best_answer(user, question_id, answer_id) -> None:
    """ベストアンサーを決める。answer_id が None なら解除。質問した人だけ。"""
    question = get_object_or_404(Question, pk=question_id, is_deleted=False)
    if question.user != user:
        raise PermissionDenied("Only the question author can set the best answer.")

    if answer_id is None:
        question.best_answer = None
    else:
        question.best_answer = get_object_or_404(
            Answer, pk=answer_id, question=question, is_deleted=False
        )
    question.save(update_fields=["best_answer", "updated_at"])
