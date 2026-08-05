"""タグの HTTP 入口。"""

from rest_framework import generics, permissions

from . import selectors
from .serializers import TagSerializer


class TagListView(generics.ListAPIView):
    """GET /api/tags/  タグ一覧（認証不要）"""

    permission_classes = [permissions.AllowAny]
    serializer_class = TagSerializer

    def get_queryset(self):
        return selectors.all_tags()
