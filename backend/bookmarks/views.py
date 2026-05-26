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
            raise ValidationError({"detail": "verse または comment を指定してください。"})

        if verse and Bookmark.objects.filter(user=user, verse=verse).exists():
            raise ValidationError({"detail": "既にブックマーク済みです。"}, code="duplicate")
        if comment and Bookmark.objects.filter(user=user, comment=comment).exists():
            raise ValidationError({"detail": "既にブックマーク済みです。"}, code="duplicate")

        serializer.save(user=user)

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
