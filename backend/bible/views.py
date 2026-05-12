import datetime

from django.core.cache import cache
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from comments.models import Comment
from comments.serializers import CommentSearchSerializer
from .models import Book, Chapter, Verse
from .serializers import BookSerializer, ChapterSerializer, VerseSerializer, VerseOfDaySerializer, VerseSearchSerializer


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


class SearchView(APIView):
    """GET /api/search/?q=  節テキストと書名を icontains で検索（口語訳のみ）。"""

    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"verses": [], "books": [], "comments": []})

        books = Book.objects.filter(name__icontains=q, translation="口語訳").order_by("order")
        verses = (
            Verse.objects.filter(text__icontains=q)
            .select_related("chapter__book")
            .filter(chapter__book__translation="口語訳")
            .order_by("chapter__book__order", "chapter__number", "number")[:30]
        )
        comments = (
            Comment.objects.filter(body__icontains=q, is_deleted=False, parent=None)
            .select_related("user", "verse__chapter__book", "chapter__book", "book")
            .order_by("-created_at")[:20]
        )

        return Response({
            "verses": VerseSearchSerializer(verses, many=True).data,
            "books": BookSerializer(books, many=True).data,
            "comments": CommentSearchSerializer(comments, many=True).data,
        })


class VerseOfDayView(APIView):
    """GET /api/verse-of-the-day/  今日の聖句（日付ベースの決定論的選択）"""

    permission_classes = [AllowAny]

    def get(self, request):
        today = datetime.date.today()
        cache_key = f"verse_of_day_{today.isoformat()}"
        data = cache.get(cache_key)
        if data is None:
            day_of_year = today.timetuple().tm_yday
            count = Verse.objects.count()
            if count == 0:
                return Response({"detail": "聖書データが未登録です。"}, status=503)
            index = (day_of_year - 1) % count
            verse = (
                Verse.objects.select_related("chapter__book")
                .order_by("chapter__book__order", "chapter__number", "number")[index]
            )
            data = VerseOfDaySerializer(verse).data
            tomorrow = today + datetime.timedelta(days=1)
            midnight = datetime.datetime.combine(tomorrow, datetime.time.min)
            ttl = int((midnight - datetime.datetime.now()).total_seconds())
            cache.set(cache_key, data, ttl)
        return Response(data)
