"""お気に入りの書き込み。

「何を対象にできるか」「同じものを二重に入れさせない」という規則をここに置く。
読み出しは selectors.py。
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from rest_framework.exceptions import ValidationError

from translations.access import can_view_project_work, get_visible_project_or_404

from .models import Bookmark

_DUPLICATE = "Already in your favorites."


def resolve_visible_targets(user, data) -> None:
    """企画・コメントを指すお気に入りを、シリアライザの検証より先に解決する。

    見えない企画・存在しない id・壊れた UUID を、すべて同じ 404 に見せるため
    （検証エラーとの違いから「その id は実在する」と当てられないようにする）。
    """
    project_id = data.get("translation_project")
    if project_id:
        get_visible_project_or_404(user, project_id)

    comment_id = data.get("comment")
    if not comment_id:
        return

    from comments.models import Comment

    try:
        comment = Comment.objects.select_related("translation_project").get(pk=comment_id)
    except (Comment.DoesNotExist, DjangoValidationError, TypeError, ValueError):
        raise Http404 from None
    if comment.translation_project is not None and not can_view_project_work(
        user, comment.translation_project
    ):
        raise Http404


def derive_location(*, verse=None, chapter=None, book=None) -> dict:
    """入力の verse/chapter/book から、訳に依存しない箇所を作る。

    クライアントからは受け取らない（偽装を防ぐため入力の FK から導出する）。
    粒度を確定させるため、使わない列には明示的に None を入れる。重複判定も
    IS NULL で一致させたいので、キーを省略してはいけない。
    """
    if verse:
        ch = verse.chapter
        return {
            "canonical_book_id": ch.book.canonical_book_id,
            "chapter_number": ch.number,
            "verse_number": verse.number,
        }
    if chapter:
        return {
            "canonical_book_id": chapter.book.canonical_book_id,
            "chapter_number": chapter.number,
            "verse_number": None,
        }
    if book:
        return {
            "canonical_book_id": book.canonical_book_id,
            "chapter_number": None,
            "verse_number": None,
        }
    return {}


def check_not_duplicated(user, *, location: dict, comment=None, project=None) -> None:
    """同じ対象がすでに入っていれば弾く。ビューが 409 に翻訳する。"""
    if location and Bookmark.objects.filter(user=user, **location).exists():
        raise ValidationError({"detail": _DUPLICATE}, code="duplicate")
    if comment and Bookmark.objects.filter(user=user, comment=comment).exists():
        raise ValidationError({"detail": _DUPLICATE}, code="duplicate")
    if project and Bookmark.objects.filter(user=user, translation_project=project).exists():
        raise ValidationError({"detail": _DUPLICATE}, code="duplicate")


def check_target_visible(user, *, comment=None, project=None) -> None:
    """対象が本当に見えるかを、保存の直前にもう一度確かめる。"""
    if project and not can_view_project_work(user, project):
        raise Http404
    comment_project = (
        comment.translation_project if comment and comment.translation_project_id else None
    )
    if comment_project and not can_view_project_work(user, comment_project):
        raise Http404
