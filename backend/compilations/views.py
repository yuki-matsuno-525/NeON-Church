from django.db import transaction
from django.db.models import Count, F, Max, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination
from .models import CompiledBook, CompiledChapter, CompiledComment, CompiledVerse, MotifTag
from .serializers import (
    CompiledBookDetailSerializer,
    CompiledBookSummarySerializer,
    CompiledChapterSerializer,
    CompiledCommentSerializer,
    CompiledVerseSerializer,
    MotifTagSerializer,
    renumber_chapter_verses,
    renumber_chapters,
    renumber_tray_verses,
)


def can_view_compiled_book(book: CompiledBook, user) -> bool:
    if book.visibility in (CompiledBook.VISIBILITY_PUBLIC, CompiledBook.VISIBILITY_UNLISTED):
        return True
    return bool(user and user.is_authenticated and book.owner_id == user.id)


def _visible_book_or_404(request, book_id) -> CompiledBook:
    book = get_object_or_404(CompiledBook.objects.select_related("owner"), pk=book_id)
    if not can_view_compiled_book(book, request.user):
        raise PermissionDenied("This compiled book is private.")
    return book


def _require_owner(request, book: CompiledBook) -> None:
    if not request.user.is_authenticated or book.owner_id != request.user.id:
        raise PermissionDenied("Only the owner can edit this compiled book.")


class MotifTagListCreateView(generics.ListCreateAPIView):
    queryset = MotifTag.objects.all()
    serializer_class = MotifTagSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]


class MotifTagDetailView(generics.RetrieveAPIView):
    queryset = MotifTag.objects.all()
    serializer_class = MotifTagSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"


class CompiledBookListCreateView(generics.ListCreateAPIView):
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CompiledBookDetailSerializer
        return CompiledBookSummarySerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = (
            CompiledBook.objects.select_related("owner")
            .prefetch_related("motifs")
            .annotate(chapter_count=Count("chapters", distinct=True), verse_count=Count("verses", distinct=True))
        )
        user = self.request.user
        mine = self.request.query_params.get("mine")
        if mine in ("1", "true", "yes"):
            if not user.is_authenticated:
                return qs.none()
            return qs.filter(owner=user)
        if user.is_authenticated:
            return qs.filter(Q(visibility=CompiledBook.VISIBILITY_PUBLIC) | Q(owner=user))
        return qs.filter(visibility=CompiledBook.VISIBILITY_PUBLIC)


class CompiledBookDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CompiledBookDetailSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        qs = (
            CompiledBook.objects.select_related("owner", "forked_from")
            .prefetch_related(
                "motifs",
                "chapters__motifs",
                "chapters__verses__motifs",
                "chapters__verses__source_verse__chapter__book__canonical_book",
                "verses__motifs",
                "verses__source_verse__chapter__book__canonical_book",
            )
            .annotate(chapter_count=Count("chapters", distinct=True), verse_count=Count("verses", distinct=True))
        )
        book = get_object_or_404(qs, pk=self.kwargs["book_id"])
        if not can_view_compiled_book(book, self.request.user):
            raise PermissionDenied("This compiled book is private.")
        if self.request.method not in permissions.SAFE_METHODS:
            _require_owner(self.request, book)
        return book


class CompiledBookPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, book_id):
        book = get_object_or_404(CompiledBook, pk=book_id)
        _require_owner(request, book)
        book.visibility = CompiledBook.VISIBILITY_PUBLIC
        book.save(update_fields=["visibility", "updated_at"])
        return Response(CompiledBookDetailSerializer(book, context={"request": request}).data)


class CompiledBookUnpublishView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, book_id):
        book = get_object_or_404(CompiledBook, pk=book_id)
        _require_owner(request, book)
        book.visibility = CompiledBook.VISIBILITY_PRIVATE
        book.save(update_fields=["visibility", "updated_at"])
        return Response(CompiledBookDetailSerializer(book, context={"request": request}).data)


class CompiledChapterListCreateView(generics.ListCreateAPIView):
    serializer_class = CompiledChapterSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_book(self):
        book = _visible_book_or_404(self.request, self.kwargs["book_id"])
        if self.request.method == "POST":
            _require_owner(self.request, book)
        return book

    def get_queryset(self):
        return (
            self.get_book().chapters.prefetch_related("motifs", "verses__motifs")
            .annotate(verse_count=Count("verses"))
            .order_by("order", "number")
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["book"] = self.get_book()
        return ctx


class CompiledChapterDetailView(generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = CompiledChapterSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch", "delete", "head", "options"]

    def get_object(self):
        book = get_object_or_404(CompiledBook, pk=self.kwargs["book_id"])
        _require_owner(self.request, book)
        return get_object_or_404(CompiledChapter, pk=self.kwargs["chapter_id"], book=book)

    def perform_destroy(self, instance):
        """章を消しても中の節は捨てない。断章ボックスの上へ戻し、残りの章の番号を詰める。"""
        book = instance.book
        with transaction.atomic():
            for verse in instance.verses.all().order_by("order", "created_at"):
                verse.chapter = None
                verse.verse_number = None
                verse.order = 0
                verse.save(update_fields=["chapter", "verse_number", "order", "updated_at"])
            instance.delete()
            renumber_tray_verses(book)
            renumber_chapters(book)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["book"] = self.get_object().book
        return ctx


class CompiledVerseListCreateView(generics.ListCreateAPIView):
    serializer_class = CompiledVerseSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_book(self):
        book = _visible_book_or_404(self.request, self.kwargs["book_id"])
        if self.request.method == "POST":
            _require_owner(self.request, book)
        return book

    def get_queryset(self):
        book = self.get_book()
        qs = (
            book.verses.select_related(
                "chapter",
                "source_verse__chapter__book__canonical_book",
                "source_translation_unit__project",
                "source_translation_unit__verse__chapter",
                "source_compiled_verse__book",
                "source_compiled_verse__chapter",
            )
            .prefetch_related("motifs")
            .order_by("chapter__order", "order", "created_at")
        )
        chapter_id = self.request.query_params.get("chapter")
        if chapter_id:
            qs = qs.filter(chapter_id=chapter_id)
        elif self.request.query_params.get("tray") in ("1", "true", "yes"):
            qs = qs.filter(chapter__isnull=True)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["book"] = self.get_book()
        return ctx


class CompiledVerseBulkCreateView(APIView):
    """読む画面で選んだ複数の節を、選んだ順のまま断章ボックスの上へまとめて入れる。"""

    permission_classes = [permissions.IsAuthenticated]
    MAX_VERSES = 100

    def post(self, request, book_id):
        book = get_object_or_404(CompiledBook, pk=book_id)
        _require_owner(request, book)

        source_verses = _id_list(request.data.get("source_verses"))
        if not source_verses:
            return Response({"detail": "source_verses must be a list of unique ids."}, status=status.HTTP_400_BAD_REQUEST)
        if len(source_verses) > self.MAX_VERSES:
            return Response(
                {"detail": f"Cannot add more than {self.MAX_VERSES} verses at once."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # 既に入っている断章を人数分だけ下げ、上に並べる場所をあける。
            CompiledVerse.objects.filter(book=book, chapter__isnull=True).update(order=F("order") + len(source_verses))
            for index, verse_id in enumerate(source_verses, start=1):
                serializer = CompiledVerseSerializer(
                    data={"source_verse": verse_id, "order": index},
                    context={"book": book, "request": request},
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()

        return Response(
            CompiledBookDetailSerializer(book, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class CompiledVerseDetailView(generics.UpdateAPIView, generics.DestroyAPIView):
    serializer_class = CompiledVerseSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["patch", "delete", "head", "options"]

    def get_object(self):
        book = get_object_or_404(CompiledBook, pk=self.kwargs["book_id"])
        _require_owner(self.request, book)
        return get_object_or_404(CompiledVerse, pk=self.kwargs["verse_id"], book=book)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["book"] = self.get_object().book
        return ctx


def _id_list(raw) -> list[str] | None:
    if not isinstance(raw, list):
        return None
    ids = [str(x) for x in raw]
    if len(set(ids)) != len(ids):
        return None
    return ids


class CompiledVerseReorderView(APIView):
    """章（または断章ボックス）の中身を、送られた並び順そのままに置き直す。

    verse_ids には、その章（または断章ボックス）に置きたい節を、上から順に全部入れて送る。
    他の章から移ってきた節が混じっていてもよく、その場合は移動元の章の節番号を詰め直す。
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, book_id):
        book = get_object_or_404(CompiledBook, pk=book_id)
        _require_owner(request, book)

        verse_ids = _id_list(request.data.get("verse_ids"))
        if verse_ids is None:
            return Response({"detail": "verse_ids must be a list of unique ids."}, status=status.HTTP_400_BAD_REQUEST)

        chapter = None
        chapter_id = request.data.get("chapter") or None
        if chapter_id:
            chapter = get_object_or_404(CompiledChapter, pk=chapter_id, book=book)

        verses_by_id = {str(verse.id): verse for verse in book.verses.all()}
        if any(vid not in verses_by_id for vid in verse_ids):
            return Response({"detail": "Unknown verse id for this compiled book."}, status=status.HTTP_400_BAD_REQUEST)

        source_chapter_ids = {verses_by_id[vid].chapter_id for vid in verse_ids if verses_by_id[vid].chapter_id}
        came_from_tray = any(verses_by_id[vid].chapter_id is None for vid in verse_ids)

        with transaction.atomic():
            for index, vid in enumerate(verse_ids, start=1):
                verse = verses_by_id[vid]
                verse.chapter = chapter
                verse.order = index
                verse.verse_number = index if chapter else None
                verse.save(update_fields=["chapter", "order", "verse_number", "updated_at"])

            keep_id = chapter.id if chapter else None
            for other_id in source_chapter_ids - {keep_id}:
                renumber_chapter_verses(CompiledChapter.objects.get(pk=other_id))
            if chapter is not None and came_from_tray:
                renumber_tray_verses(book)

        return Response(CompiledBookDetailSerializer(book, context={"request": request}).data)


class CompiledChapterReorderView(APIView):
    """章の並び順を置き直す。chapter_ids にはこの編纂書の全章を上から順に入れて送る。"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, book_id):
        book = get_object_or_404(CompiledBook, pk=book_id)
        _require_owner(request, book)

        chapter_ids = _id_list(request.data.get("chapter_ids"))
        if chapter_ids is None:
            return Response({"detail": "chapter_ids must be a list of unique ids."}, status=status.HTTP_400_BAD_REQUEST)

        chapters_by_id = {str(chapter.id): chapter for chapter in book.chapters.all()}
        if set(chapter_ids) != set(chapters_by_id):
            return Response({"detail": "chapter_ids must list every chapter of this compiled book."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # (book, number) が一意なので、いったん衝突しない番号へ逃がしてから振り直す。
            parking = int(book.chapters.aggregate(max_num=Max("number"))["max_num"] or 0) + len(chapter_ids) + 1
            for offset, cid in enumerate(chapter_ids):
                chapter = chapters_by_id[cid]
                chapter.number = parking + offset
                chapter.save(update_fields=["number", "updated_at"])
            for index, cid in enumerate(chapter_ids, start=1):
                chapter = chapters_by_id[cid]
                chapter.number = index
                chapter.order = index
                chapter.save(update_fields=["number", "order", "updated_at"])

        return Response(CompiledBookDetailSerializer(book, context={"request": request}).data)


class CompiledCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CompiledCommentSerializer
    pagination_class = StandardPageNumberPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def _target_filter(self):
        params = self.request.query_params if self.request.method == "GET" else self.request.data
        book_id = params.get("book")
        chapter_id = params.get("chapter")
        verse_id = params.get("verse")
        targets = [x for x in (book_id, chapter_id, verse_id) if x]
        if len(targets) != 1:
            return None
        if book_id:
            book = _visible_book_or_404(self.request, book_id)
            return {"book": book}
        if chapter_id:
            chapter = get_object_or_404(CompiledChapter.objects.select_related("book"), pk=chapter_id)
            if not can_view_compiled_book(chapter.book, self.request.user):
                raise PermissionDenied("This compiled chapter is private.")
            return {"chapter": chapter}
        verse = get_object_or_404(CompiledVerse.objects.select_related("book"), pk=verse_id)
        if not can_view_compiled_book(verse.book, self.request.user):
            raise PermissionDenied("This compiled verse is private.")
        return {"verse": verse}

    def get_queryset(self):
        target = self._target_filter()
        if target is None:
            return CompiledComment.objects.none()
        return CompiledComment.objects.filter(**target).select_related("user").order_by("-created_at")

    def create(self, request, *args, **kwargs):
        target = self._target_filter()
        if target is None:
            return Response({"detail": "Specify exactly one target."}, status=status.HTTP_400_BAD_REQUEST)
        data = request.data.copy()
        for key, value in target.items():
            data[key] = str(value.id)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CompiledCommentDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, comment_id):
        comment = get_object_or_404(CompiledComment, pk=comment_id)
        target_book = comment.book or (comment.chapter.book if comment.chapter_id else comment.verse.book)
        if comment.user_id != request.user.id and target_book.owner_id != request.user.id:
            return Response({"detail": "Only the author or compiled book owner can delete."}, status=status.HTTP_403_FORBIDDEN)
        comment.is_deleted = True
        comment.body = ""
        comment.save(update_fields=["is_deleted", "body", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
