from django.db import transaction
from django.db.models import Case, IntegerField, OuterRef, Subquery, When
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError

from bible.models import Verse
from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwner
from .models import Bookmark
from .serializers import BookmarkSerializer


class BookmarkListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/bookmarks/  自分のブックマーク一覧（要認証）
    POST /api/bookmarks/  ブックマーク追加（重複は 409）
    """

    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        # 節栞は訳非依存の箇所しか持たないので、一覧で本文を見せるために表示用の節本文を
        # サブクエリで引く（口語訳を優先し、無ければ任意の訳）。N+1 を避けるため本体クエリに含める。
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
        return (
            Bookmark.objects.filter(user=self.request.user)
            .select_related(
                "comment__user", "comment__canonical_book", "canonical_book",
                "translation_project",
            )
            .annotate(verse_text=Subquery(verse_text_subq))
        )

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
