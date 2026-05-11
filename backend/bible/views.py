import datetime

from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Book, Chapter, Verse
from .serializers import BookSerializer, ChapterSerializer, VerseSerializer, VerseOfDaySerializer


class BookListView(generics.ListAPIView):
    """書一覧。認証不要。?translation=和訳 でフィルタ可能。"""

    permission_classes = [AllowAny]
    serializer_class = BookSerializer

    def get_queryset(self):
        qs = Book.objects.all()
        translation = self.request.query_params.get("translation")
        if translation:
            qs = qs.filter(translation=translation)
        return qs


class ChapterListView(generics.ListAPIView):
    """指定した書の章一覧。書が存在しない場合は 404。"""

    permission_classes = [AllowAny]
    serializer_class = ChapterSerializer

    def get_queryset(self):
        # book_id が存在しない場合は 404 を返す
        book = generics.get_object_or_404(Book, pk=self.kwargs["book_id"])
        return Chapter.objects.filter(book=book)


class VerseListView(generics.ListAPIView):
    """指定した章の節一覧。章が存在しない場合は 404。"""

    permission_classes = [AllowAny]
    serializer_class = VerseSerializer

    def get_queryset(self):
        chapter = generics.get_object_or_404(Chapter, pk=self.kwargs["chapter_id"])
        return Verse.objects.filter(chapter=chapter)


class VerseOfDayView(APIView):
    """GET /api/verse-of-the-day/  今日の聖句（日付ベースの決定論的選択）"""

    permission_classes = [AllowAny]

    def get(self, request):
        today = datetime.date.today()
        day_of_year = today.timetuple().tm_yday
        count = Verse.objects.count()
        if count == 0:
            return Response({"detail": "聖書データが未登録です。"}, status=503)
        index = (day_of_year - 1) % count
        verse = (
            Verse.objects.select_related("chapter__book")
            .order_by("chapter__book__order", "chapter__number", "number")[index]
        )
        return Response(VerseOfDaySerializer(verse).data)
