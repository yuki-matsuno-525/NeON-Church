from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError

from .models import Bookmark
from .serializers import BookmarkSerializer


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class BookmarkListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/bookmarks/  自分のブックマーク一覧（要認証）
    POST /api/bookmarks/  ブックマーク追加（重複は 409）
    """

    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Bookmark.objects.filter(user=self.request.user)
            .select_related("verse__chapter__book")
        )

    def perform_create(self, serializer):
        user = self.request.user
        verse = serializer.validated_data["verse"]
        if Bookmark.objects.filter(user=user, verse=verse).exists():
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
