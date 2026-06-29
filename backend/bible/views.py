import datetime

from django.core.cache import cache
from django.utils import timezone
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
    authentication_classes: list = []
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
    authentication_classes: list = []
    serializer_class = ChapterSerializer

    def get_queryset(self):
        # book_id が存在しない場合は 404 を返す
        book = generics.get_object_or_404(Book, pk=self.kwargs["book_id"])
        return Chapter.objects.filter(book=book)


class VerseListView(generics.ListAPIView):
    """指定した章の節一覧。章が存在しない場合は 404。"""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    serializer_class = VerseSerializer

    def get_queryset(self):
        chapter = generics.get_object_or_404(Chapter, pk=self.kwargs["chapter_id"])
        return Verse.objects.filter(chapter=chapter)


class SearchView(APIView):
    """GET /api/search/?q=  節テキストと書名を icontains で検索（全翻訳対象）。"""

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"verses": [], "books": [], "comments": []})

        books = Book.objects.filter(name__icontains=q).order_by("order")
        verses = (
            Verse.objects.filter(text__icontains=q)
            .select_related("chapter__book")
            .order_by("chapter__book__order", "chapter__number", "number")[:30]
        )
        comments = (
            Comment.objects.filter(body__icontains=q, is_deleted=False, parent=None, translation_project__isnull=True)
            .select_related("user", "verse__chapter__book", "chapter__book", "book")
            .order_by("-created_at")[:20]
        )

        return Response({
            "verses": VerseSearchSerializer(verses, many=True).data,
            "books": BookSerializer(books, many=True).data,
            "comments": CommentSearchSerializer(comments, many=True).data,
        })


class VerseOfDayView(APIView):
    """GET /api/verse-of-the-day/  今日の聖句（日付ベースの決定論的選択）

    ?translation=KJV を渡すと、同じ日付インデックスの節を KJV テキストで返す。
    口語訳の節順序を基準にして、book.order / chapter.number / verse.number で対応節を引く。
    """

    permission_classes = [AllowAny]
    # 認証不要の公開エンドポイント。壊れた/期限切れの Cookie を送られても 401 にせず、
    # トークンを完全に無視する（iOS Safari の ITP でクッキーが部分的に破損する症状対策）。
    authentication_classes: list = []

    def get(self, request):
        translation = request.query_params.get("translation", "口語訳")
        today = timezone.localdate()
        cache_key = f"verse_of_day_{translation}_{today.isoformat()}"
        data = cache.get(cache_key)
        if data is None:
            day_of_year = today.timetuple().tm_yday
            # 常に口語訳を基準に「今日の節」の位置を決める
            base_qs = Verse.objects.filter(chapter__book__translation="口語訳")
            count = base_qs.count()
            if count == 0:
                return Response({"detail": "Bible data not found."}, status=503)
            index = (day_of_year - 1) % count
            base_verse = (
                base_qs.select_related("chapter__book")
                .order_by("chapter__book__order", "chapter__number", "number")[index]
            )

            if translation == "口語訳":
                verse = base_verse
            else:
                # 同じ書順・章・節番号で指定翻訳の節を探す
                book_order = base_verse.chapter.book.order
                chapter_num = base_verse.chapter.number
                verse_num = base_verse.number
                verse = (
                    Verse.objects.filter(
                        chapter__book__translation=translation,
                        chapter__book__order=book_order,
                        chapter__number=chapter_num,
                        number=verse_num,
                    )
                    .select_related("chapter__book")
                    .first()
                ) or base_verse  # KJV に対応節がなければ口語訳にフォールバック

            data = VerseOfDaySerializer(verse).data
            tomorrow = today + datetime.timedelta(days=1)
            midnight = timezone.make_aware(datetime.datetime.combine(tomorrow, datetime.time.min))
            ttl = int((midnight - timezone.now()).total_seconds())
            cache.set(cache_key, data, ttl)
        return Response(data)
