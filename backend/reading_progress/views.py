"""読書進捗の HTTP 入口。"""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.schema import DetailSerializer

from . import selectors, services
from .serializers import ReadingProgressSerializer


class ReadingProgressSaveRequestSerializer(serializers.Serializer):
    """進捗保存の入力。book と chapter は表示中の訳の id。"""

    book = serializers.UUIDField()
    chapter = serializers.UUIDField()


class ReadingProgressListView(generics.ListAPIView):
    """
    GET /api/reading-progress/  自分の読書進捗一覧（要認証）
    """

    serializer_class = ReadingProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return selectors.own_progress(self.request.user)


class ReadingProgressSaveView(APIView):
    """
    POST /api/reading-progress/save/  進捗を保存（upsert: user+book 単位で更新or作成）
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=ReadingProgressSaveRequestSerializer,
        responses={
            200: ReadingProgressSerializer,
            201: ReadingProgressSerializer,
            400: DetailSerializer,
        },
    )
    def post(self, request, *args, **kwargs):
        progress, created = services.save_progress(
            request.user, request.data.get("book"), request.data.get("chapter")
        )
        return Response(
            ReadingProgressSerializer(progress).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
