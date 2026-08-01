from django.db import transaction
from django.db.models import Case, IntegerField, OuterRef, Subquery, When
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError

from bible.models import Verse
from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwner
from .filters import count_by_type, filter_by_location, filter_by_type
from .models import Bookmark
from .serializers import BookmarkSerializer


def annotate_verse_text(queryset):
    """一覧表示用に、節栞の本文をサブクエリで引いて付ける。

    節栞は訳非依存の箇所しか持たないので、本文は都度引く必要がある（口語訳を優先し、
    無ければ任意の訳）。N+1 を避けるため本体クエリに含める。
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


class BookmarkListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/bookmarks/         自分のブックマーク一覧（要認証）
    GET  /api/bookmarks/?type=verse  種類で絞り込み（verse/chapter/book/comment/project）
    POST /api/bookmarks/         ブックマーク追加（重複は 409）

    一覧レスポンスには通常の count/next/results に加えて counts を付ける。
    counts は絞り込み前の全種類の件数で、画面のタブに出す数字に使う。

    読書画面向けに箇所での絞り込みも受ける（`filters.filter_by_location` を参照）。
    GET /api/bookmarks/?book=<書のslug>              その書の書栞
    GET /api/bookmarks/?book=<書のslug>&chapter=<章> その章の章栞・節栞・コメント栞
    GET /api/bookmarks/?translation_project=<id>     その翻訳企画の栞
    箇所で絞ったときは counts を付けない（画面のタブに使わないため、集計の往復を省く）。
    """

    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPageNumberPagination

    def get_base_queryset(self):
        """絞り込み前の自分の栞。件数集計にも使うので annotate は付けない。"""
        return Bookmark.objects.filter(user=self.request.user)

    def _location_params(self):
        """箇所での絞り込みの指定を取り出す。1つも指定が無ければ None を返す。"""
        params = self.request.query_params
        book_slug = params.get("book")
        project_id = params.get("translation_project")
        if not book_slug and not project_id:
            return None
        chapter = params.get("chapter")
        chapter_number = int(chapter) if chapter and chapter.isdigit() else None
        return book_slug, chapter_number, project_id

    def get_queryset(self):
        qs = self.get_base_queryset().select_related(
            "comment__user", "comment__canonical_book", "canonical_book",
            "translation_project",
        )
        location = self._location_params()
        if location:
            qs = filter_by_location(qs, *location)
        else:
            qs = filter_by_type(qs, self.request.query_params.get("type"))
        return annotate_verse_text(qs)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # 箇所で絞ったときはタブを出さないので、件数集計の1往復を省く。
        if self._location_params() is None:
            response.data["counts"] = count_by_type(self.get_base_queryset())
        return response

    def perform_create(self, serializer):
        user = self.request.user
        # verse(節栞)/chapter(章栞)/book(書栞) は保存しない入力。ここで箇所へ変換し、キー自体は取り除く。
        verse = serializer.validated_data.pop("verse", None)
        chapter = serializer.validated_data.pop("chapter", None)
        book = serializer.validated_data.pop("book", None)
        comment = serializer.validated_data.get("comment")
        project = serializer.validated_data.get("translation_project")

        if not any([verse, chapter, book, comment, project]):
            raise ValidationError({"detail": "Specify verse, chapter, book, comment or project."})

        # 箇所栞は訳非依存の箇所（canonical_book/章番号/節番号）を backend が導出して保存する
        # （クライアントからは受け取らない＝偽装防止）。節栞=章+節、章栞=章のみ、書栞=書のみ。
        # verse_number/chapter_number は明示的に None を入れて「粒度」を確定させる（重複判定も IS NULL で一致）。
        location = {}
        if verse:
            ch = verse.chapter
            location = {
                "canonical_book_id": ch.book.canonical_book_id,
                "chapter_number": ch.number,
                "verse_number": verse.number,
            }
        elif chapter:
            location = {
                "canonical_book_id": chapter.book.canonical_book_id,
                "chapter_number": chapter.number,
                "verse_number": None,
            }
        elif book:
            location = {
                "canonical_book_id": book.canonical_book_id,
                "chapter_number": None,
                "verse_number": None,
            }

        # 同一ユーザー・同一対象の重複を弾く（章栞/書栞は verse/chapter が NULL の行だけを対象に一致）。
        if location and Bookmark.objects.filter(user=user, **location).exists():
            raise ValidationError({"detail": "Already bookmarked."}, code="duplicate")
        if comment and Bookmark.objects.filter(user=user, comment=comment).exists():
            raise ValidationError({"detail": "Already bookmarked."}, code="duplicate")
        if project and Bookmark.objects.filter(user=user, translation_project=project).exists():
            raise ValidationError({"detail": "Already bookmarked."}, code="duplicate")

        with transaction.atomic():
            serializer.save(user=user, **location)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as exc:
            from rest_framework.response import Response
            return Response(exc.detail, status=status.HTTP_409_CONFLICT)


class BookmarkDestroyView(generics.DestroyAPIView):
    """
    DELETE /api/bookmarks/{pk}/  ブックマーク削除（自分のもののみ）
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = Bookmark.objects.all()
