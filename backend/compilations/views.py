from django.db.models import Count, Q
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
