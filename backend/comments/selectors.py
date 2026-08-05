"""コメントの読み出し。

箇所での集約（訳をまたいで同じスレッドにまとめる）の規則がここに集まる。
書き込みは services.py。
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import models
from django.db.models import Count, QuerySet
from django.http import Http404

from translations.access import can_view_project_work, get_visible_project_or_404

from .models import Comment


def _with_counts(qs: QuerySet) -> QuerySet:
    """高評価数と返信数を本体クエリで数える。

    返信を開く前に「返信 N件」を出したいので、一覧では必ず付ける。
    削除済みの返信は数えない（開いたときの見た目と数が合わなくなるため）。

    annotate のキーワードは展開せず直に書く。dict を **展開すると
    型チェッカが別名を追えず、あとで order_by("-vote_count") が
    「そんな列は無い」と誤検出される。
    """
    return qs.annotate(
        vote_count=Count("votes", distinct=True),
        reply_count=Count("replies", distinct=True, filter=models.Q(replies__is_deleted=False)),
    )


def get_visible_comment_or_404(user, **lookup) -> Comment:
    """見えるコメントを1件引く。

    存在しない id・壊れた UUID・見えない企画のコメントを、すべて同じ 404 に見せる。
    違いが出ると「その id は実在する」と当てられてしまう。
    """
    try:
        comment = Comment.objects.select_related("translation_project").get(**lookup)
    except (Comment.DoesNotExist, DjangoValidationError, TypeError, ValueError):
        raise Http404 from None
    if comment.translation_project is not None and not can_view_project_work(
        user, comment.translation_project
    ):
        raise Http404
    return comment


def location_from_target(*, verse_id=None, chapter_id=None, book_id=None):
    """旧ターゲット id（verse/chapter/book のいずれか）を箇所列フィルタへ解決する。

    段階6D: コメントを訳横断の箇所で集約取得するために使う。存在しない id は None を返す。
    返り値は Comment.objects.filter(**loc) に渡せる dict。
    """
    from bible.models import Book, Chapter, Verse

    if verse_id:
        v = Verse.objects.filter(id=verse_id).select_related("chapter__book").first()
        if not v:
            return None
        return {
            "canonical_book_id": v.chapter.book.canonical_book_id,
            "chapter_number": v.chapter.number,
            "verse_number": v.number,
        }
    if chapter_id:
        ch = Chapter.objects.filter(id=chapter_id).select_related("book").first()
        if not ch:
            return None
        return {
            "canonical_book_id": ch.book.canonical_book_id,
            "chapter_number": ch.number,
            "verse_number__isnull": True,
        }
    if book_id:
        b = Book.objects.filter(id=book_id).first()
        if not b:
            return None
        return {
            "canonical_book_id": b.canonical_book_id,
            "chapter_number__isnull": True,
            "verse_number__isnull": True,
        }
    return None


def _base_list_queryset() -> QuerySet:
    return _with_counts(
        Comment.objects.select_related(
            "user", "translation_project", "canonical_book"
        ).prefetch_related("tags")
    )


def thread_comments(user, params) -> QuerySet:
    """箇所または親コメントで絞った一覧。

    箇所で絞るときは **親コメントだけ** を返す（返信は parent_id で別に取る）。
    以前は親も返信も混ぜた1本の列を返し、フロントが親子に組み直していたが、
    ページで区切ると親と返信が別ページに分かれ、親が見つからない返信が
    エラーも出さずに画面から消えていた。親と返信を分けて数えることでこれを防ぐ。

    どの絞り込みも指定が無ければ空を返す（全コメントを吐き出さない）。
    """
    qs = _base_list_queryset()

    translation_project_id = params.get("translation_project")
    visible_project = None
    if translation_project_id:
        visible_project = get_visible_project_or_404(user, translation_project_id)

    book_slug = params.get("book_slug")
    if book_slug:
        qs = qs.filter(canonical_book__slug=book_slug)
        chapter_number = params.get("chapter_number")
        verse_number = params.get("verse_number")
        if verse_number:
            qs = qs.filter(chapter_number=chapter_number, verse_number=verse_number)
        elif chapter_number:
            qs = qs.filter(chapter_number=chapter_number, verse_number__isnull=True)
        else:
            qs = qs.filter(chapter_number__isnull=True, verse_number__isnull=True)
        qs = qs.filter(parent__isnull=True)
    elif params.get("verse_id") or params.get("chapter_id") or params.get("book_id"):
        loc = location_from_target(
            verse_id=params.get("verse_id"),
            chapter_id=params.get("chapter_id"),
            book_id=params.get("book_id"),
        )
        if loc is None:
            return qs.none()
        qs = qs.filter(**loc, parent__isnull=True)
    elif params.get("parent_id"):
        qs = qs.filter(parent_id=params.get("parent_id"))
    else:
        return qs.none()

    # スコープ（翻訳企画／聖書本体）で分離する。混ぜない。訳横断の集約は箇所で行い、
    # 本体コメントと特定企画のコメントは別スレッドとして扱う。
    if visible_project:
        qs = qs.filter(translation_project=visible_project)
    else:
        qs = qs.filter(translation_project__isnull=True)

    tag_id = params.get("tag_id")
    if tag_id:
        # M2M の JOIN で行が増えるので distinct() を末尾に付ける。
        qs = qs.filter(tags__id=tag_id).distinct()

    if params.get("ordering", "new") == "votes":
        return qs.order_by("-vote_count", "-created_at")
    return qs.order_by("-created_at")


def own_comments(user) -> QuerySet:
    """自分のコメント一覧（削除済み除く、新着順）。"""
    return (
        Comment.objects.filter(user=user, is_deleted=False, translation_project__isnull=True)
        .select_related("canonical_book")
        .annotate(vote_count=Count("votes"))
        .order_by("-created_at")
    )


def trending_comments(limit: int = 5) -> QuerySet:
    """高評価の多い順トップ。企画内コメントは混ぜない（見えない人がいるため）。"""
    qs = _with_counts(
        Comment.objects.filter(is_deleted=False, parent=None, translation_project__isnull=True)
        .select_related("user", "canonical_book")
        .prefetch_related("tags")
    )
    return qs.order_by("-vote_count", "-created_at")[:limit]
