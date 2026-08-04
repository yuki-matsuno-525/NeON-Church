"""利用者まわりの読み出し。

公開プロフィールから辿れる一覧（コメント・お気に入り）の「何を見せるか」を
ここに集める。書き込みは services.py。
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, QuerySet
from rest_framework.exceptions import NotFound

User = get_user_model()


def get_user_or_404(username: str):
    """公開プロフィールの対象。居なければ 404。"""
    try:
        return User.objects.get(username=username)
    except User.DoesNotExist:
        raise NotFound("User not found.") from None


def public_comments(username: str) -> QuerySet:
    """プロフィールに出すコメント。

    返信と翻訳企画内のコメントは出さない。前者はスレッドの文脈が無いと読めず、
    後者はその企画を見られない人にも見えてしまうため。
    """
    from comments.models import Comment

    if not User.objects.filter(username=username).exists():
        raise NotFound("User not found.")

    return (
        Comment.objects.filter(
            user__username=username,
            is_deleted=False,
            parent=None,
            translation_project__isnull=True,
        )
        .select_related("user")
        .prefetch_related("tags")
        .annotate(vote_count=Count("votes"))
        .order_by("-created_at")
    )


def public_bookmarks(username: str, viewer) -> QuerySet:
    """プロフィールに出すお気に入り（絞り込み前）。件数の集計にも使う。

    本人が「公開」にしていなければ空。加えて、見えない翻訳企画に紐づくものは
    viewer 基準で落とす（種類ごとの件数からも存在を悟られないよう、
    この段階で落としておく）。
    """
    from bookmarks.models import Bookmark
    from bookmarks.selectors import filter_by_translation_visibility

    user = get_user_or_404(username)
    if user.bookmarks_visibility != User.BOOKMARKS_PUBLIC:
        return Bookmark.objects.none()

    return filter_by_translation_visibility(Bookmark.objects.filter(user=user), viewer)
