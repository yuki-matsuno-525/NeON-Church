"""お気に入りの読み出し。

「誰に何が見えるか」と「一覧に何を添えるか」をここに集める。
プロフィール（users アプリ）からも同じ規則で引くので、ビューには置かない。
"""

from django.db.models import Case, IntegerField, OuterRef, QuerySet, Subquery, When

from bible.models import Verse
from translations.access import filter_by_project_visibility

from .models import Bookmark


def filter_by_translation_visibility(queryset: QuerySet, user) -> QuerySet:
    """見えない翻訳企画に紐づくお気に入りを落とす。

    企画そのものへのお気に入りと、企画内コメントへのお気に入りの両方が対象。
    絞り込み前の段階で落としておくことで、種類ごとの件数からも存在を悟られない。
    """
    return filter_by_project_visibility(
        queryset,
        user,
        "translation_project",
        "comment__translation_project",
    )


def annotate_verse_text(queryset: QuerySet) -> QuerySet:
    """一覧表示用に、節のお気に入りの本文をサブクエリで引いて付ける。

    節のお気に入りは訳非依存の箇所しか持たないので、本文は都度引く必要がある
    （口語訳を優先し、無ければ任意の訳）。N+1 を避けるため本体クエリに含める。
    """
    verse_text_subq = (
        Verse.objects.filter(
            chapter__book__canonical_book=OuterRef("canonical_book"),
            chapter__number=OuterRef("chapter_number"),
            number=OuterRef("verse_number"),
        )
        .order_by(
            Case(
                When(chapter__book__translation="口語訳", then=0),
                default=1,
                output_field=IntegerField(),
            )
        )
        .values("text")[:1]
    )
    return queryset.annotate(verse_text=Subquery(verse_text_subq))


def own_bookmarks(user) -> QuerySet:
    """自分のお気に入り（絞り込み前）。件数集計にも使うので annotate は付けない。"""
    return filter_by_translation_visibility(Bookmark.objects.filter(user=user), user)


def deletable_bookmarks(user) -> QuerySet:
    """削除の対象になりうる行。所有者判定は IsOwner が別に行う。"""
    return filter_by_translation_visibility(Bookmark.objects.all(), user)


# 一覧で毎回たどる関連。カードの表示に必要な範囲。
LIST_RELATED = (
    "comment__user",
    "comment__canonical_book",
    "canonical_book",
    "translation_project",
)
