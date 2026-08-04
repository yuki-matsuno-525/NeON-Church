"""Q&A の読み出し。書き込みは services.py。"""

from django.db import models
from django.db.models import Count, QuerySet

from bible.passage import location_filter

from .models import Answer, Question


def questions() -> QuerySet:
    """一覧・詳細で共通の下ごしらえ。

    回答件数は「削除されていない回答」だけ数える（削除済みが件数に残ると、
    開いたときの見た目と数が合わない）。
    """
    return (
        Question.objects.filter(is_deleted=False)
        .select_related("user", "canonical_book", "best_answer__user")
        .prefetch_related("tags")
        .annotate(
            answer_count=Count("answers", distinct=True, filter=models.Q(answers__is_deleted=False))
        )
    )


def list_questions(params) -> QuerySet:
    """絞り込み付きの質問一覧。

    book_slug (+chapter_number +verse_number)  箇所で絞る（読書ページの Q&A タブ）
    book_id                                    訳ごとの書 id。カンマ区切りで複数可
    tag_id                                     タグ
    q                                          題・本文・投稿者・タグ・書 slug を横断
    answered                                   true=解決済み / false=未解決
    """
    qs = questions()

    book_slug = params.get("book_slug")
    if book_slug:
        qs = qs.filter(
            **location_filter(
                book_slug=book_slug,
                chapter_number=params.get("chapter_number"),
                verse_number=params.get("verse_number"),
            )
        )

    book_id = params.get("book_id")
    if book_id:
        # 訳ごとの Book id で届くので、訳非依存の書へ解決してから絞る。
        from bible.models import Book

        book_ids = [b for b in book_id.split(",") if b]
        canonical_ids = list(
            Book.objects.filter(id__in=book_ids).values_list("canonical_book_id", flat=True)
        )
        qs = qs.filter(canonical_book_id__in=canonical_ids)

    tag_id = params.get("tag_id")
    if tag_id:
        qs = qs.filter(tags__id=tag_id).distinct()

    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(
            models.Q(title__icontains=q)
            | models.Q(body__icontains=q)
            | models.Q(user__username__icontains=q)
            | models.Q(tags__name__icontains=q)
            | models.Q(canonical_book__slug__icontains=q)
        ).distinct()

    answered = params.get("answered")
    if answered == "true":
        qs = qs.filter(best_answer__isnull=False)
    elif answered == "false":
        qs = qs.filter(best_answer__isnull=True)

    return qs.order_by("-created_at")


def question_answers(question_id) -> QuerySet:
    """回答一覧（古い順）。"""
    return (
        Answer.objects.filter(question_id=question_id).select_related("user").order_by("created_at")
    )


def best_answer_id(question_id):
    """ベストアンサーの id。回答ごとに質問へ聞きに行かないよう、一覧で1回だけ引く。"""
    return Question.objects.filter(pk=question_id).values_list("best_answer_id", flat=True).first()
