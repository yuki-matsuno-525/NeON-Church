from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError

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
        return (
            Bookmark.objects.filter(user=self.request.user)
            .select_related("verse__chapter__book", "comment__user")
        )

    def perform_create(self, serializer):
        user = self.request.user
        verse = serializer.validated_data.get("verse")
        comment = serializer.validated_data.get("comment")

        if not verse and not comment:
            raise ValidationError({"detail": "Specify verse or comment."})

        if verse and Bookmark.objects.filter(user=user, verse=verse).exists():
            raise ValidationError({"detail": "Already bookmarked."}, code="duplicate")
        if comment and Bookmark.objects.filter(user=user, comment=comment).exists():
            raise ValidationError({"detail": "Already bookmarked."}, code="duplicate")

        # 段階5C: verse 栞は訳非依存の箇所（canonical_book/章番号/節番号）も一緒に保存する。
        # クライアントからは受け取らず、必ず verse から backend が導出する（偽装防止）。
        location = {}
        if verse:
            chapter = verse.chapter
            location = {
                "canonical_book_id": chapter.book.canonical_book_id,
                "chapter_number": chapter.number,
                "verse_number": verse.number,
            }

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
