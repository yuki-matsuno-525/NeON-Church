from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReadingProgress
from .serializers import ReadingProgressSerializer


class ReadingProgressListView(generics.ListAPIView):
    """
    GET /api/reading-progress/  自分の読書進捗一覧（要認証）
    """

    serializer_class = ReadingProgressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            ReadingProgress.objects.filter(user=self.request.user)
            .select_related("book", "chapter")
        )


class ReadingProgressSaveView(APIView):
    """
    POST /api/reading-progress/save/  進捗を保存（upsert: user+book 単位で更新or作成）
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        book_id = request.data.get("book")
        chapter_id = request.data.get("chapter")

        if not all([book_id, chapter_id]):
            return Response(
                {"detail": "book, chapter は必須です。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        progress, created = ReadingProgress.objects.update_or_create(
            user=request.user,
            book_id=book_id,
            defaults={"chapter_id": chapter_id},
        )
        serializer = ReadingProgressSerializer(progress)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
