import datetime

from django.core.cache import cache
from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.exceptions import NotFound

from comments.models import Comment
from comments.serializers import CommentSearchSerializer
from .models import Book, CanonicalBook, Chapter, Verse
from .serializers import BookSerializer, ChapterSerializer, VerseSerializer, VerseOfDaySerializer, VerseSearchSerializer

# 検索の言語スコープ。UI 言語ごとに検索対象の訳を絞る。
# 同一箇所が訳ごとに重複しないよう、**同じ書を重複して持つ訳は入れない**（＝各言語1訳で代表させる）。
# 日本語は口語訳（現代語）を代表とし、文語訳は検索対象から外す。
# 英語(KJVと外典)・ギリシャ語(TR=新約/LXX=旧約)は書が重ならないので複数訳でも重複しない。
# 未知の言語は日本語にフォールバックする。
LANG_TRANSLATIONS = {
    "ja": ["口語訳"],
    "en": ["KJV", "Mark M. Mattison (EN)", "R. H. Charles (EN)", "L. S. A. W ells (EN)"],
    "grc": ["TR (GRC)", "LXX (GRC)"],
    "heb": ["WLC (HEB)"],
}


def _min_query_len(q: str) -> int:
    """検索クエリの最小文字数。CJK（かな・漢字）は1文字でも語として成立するため1、
    ラテン等はノイズを抑えるため2を要求する（例: 「神」は1文字で検索可能）。"""
    for ch in q:
        # ひらがな・カタカナ(぀-ヿ) または CJK統合漢字(一-鿿)
        if "぀" <= ch <= "ヿ" or "一" <= ch <= "鿿":
            return 1
    return 2


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


class _ReferenceView(APIView):
    """箇所（canonical_book.slug）から、各版（訳）の書/章/節をまとめて返す基底。

    フロントの N+1（訳ごとに書→章→節を取得）を1回の問い合わせに置き換えるための API。
    未知の slug は 404、slug は在るが該当章・節が無ければ空配列（版によって節が無いのは正常）。
    Comment/Bookmark の構造は変更しない（本 API は読み取り専用）。
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def _require_slug(self, slug: str) -> None:
        if not CanonicalBook.objects.filter(slug=slug).exists():
            raise NotFound("Unknown book.")


class ReferenceBooksView(_ReferenceView):
    """GET /api/references/<slug>/books/  その書の全版の書 id。"""

    def get(self, request, slug):
        self._require_slug(slug)
        books = Book.objects.filter(canonical_book__slug=slug).order_by("order", "translation")
        return Response({
            "reference": {"book": slug},
            "books": [{"id": str(b.id), "translation": b.translation} for b in books],
        })


class ReferenceChaptersView(_ReferenceView):
    """GET /api/references/<slug>/chapters/<chapter>/  その章の全版の章 id。"""

    def get(self, request, slug, chapter):
        self._require_slug(slug)
        chapters = (
            Chapter.objects.filter(book__canonical_book__slug=slug, number=chapter)
            .select_related("book")
            .order_by("book__order", "book__translation")
        )
        return Response({
            "reference": {"book": slug, "chapter": chapter},
            "chapters": [{"id": str(c.id), "translation": c.book.translation} for c in chapters],
        })


class ReferenceVersesView(_ReferenceView):
    """GET /api/references/<slug>/verses/<chapter>/<verse>/  その節の全版の節 id。"""

    def get(self, request, slug, chapter, verse):
        self._require_slug(slug)
        verses = (
            Verse.objects.filter(
                chapter__book__canonical_book__slug=slug,
                chapter__number=chapter,
                number=verse,
            )
            .select_related("chapter__book")
            .order_by("chapter__book__order", "chapter__book__translation")
        )
        return Response({
            "reference": {"book": slug, "chapter": chapter, "verse": verse},
            "verses": [{"id": str(v.id), "translation": v.chapter.book.translation} for v in verses],
        })


class SearchView(APIView):
    """GET /api/search/?q=&lang=&page=  節テキスト・書名・コメントを icontains で検索。

    - lang（既定 ja）で節の検索対象を UI 言語の訳に絞り、同じ箇所が訳ごとに重複しないよう
      代表訳1件に集約する（例: 口語訳と文語訳の両方に当たる箇所は口語訳だけ返す）。
    - 節は page でページングする（1冊が上位を独占しても、後続ページで全書に到達できる）。
      books / comments は1ページ目のプレビュー用（ページングしない）。
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []
    VERSE_PAGE_SIZE = 100

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        lang = request.query_params.get("lang", "ja")
        try:
            page = max(1, int(request.query_params.get("page", "1")))
        except ValueError:
            page = 1
        if len(q) < _min_query_len(q):
            return Response({"verses": [], "books": [], "comments": [], "verse_total": 0, "has_more": False})

        translations = LANG_TRANSLATIONS.get(lang, LANG_TRANSLATIONS["ja"])

        # UI 言語の訳に絞って書順で並べる（言語ごとに書が重ならない訳だけなので重複しない）。
        verses_qs = (
            Verse.objects.filter(text__icontains=q, chapter__book__translation__in=translations)
            .select_related("chapter__book", "chapter__book__canonical_book")
            .order_by("chapter__book__order", "chapter__number", "number")
        )
        verse_total = verses_qs.count()
        start = (page - 1) * self.VERSE_PAGE_SIZE
        verses = verses_qs[start : start + self.VERSE_PAGE_SIZE]
        has_more = start + self.VERSE_PAGE_SIZE < verse_total

        # 書名・コメントは1ページ目のプレビュー（ページングしない）。書名は UI 言語の訳に絞る。
        books = Book.objects.filter(name__icontains=q, translation__in=translations).order_by("order")[:20]
        comments = (
            Comment.objects.filter(body__icontains=q, is_deleted=False, parent=None, translation_project__isnull=True)
            .select_related("user", "canonical_book")
            .order_by("-created_at")[:20]
        )

        return Response({
            "verses": VerseSearchSerializer(verses, many=True).data,
            "books": BookSerializer(books, many=True).data,
            "comments": CommentSearchSerializer(comments, many=True).data,
            "verse_total": verse_total,
            "has_more": has_more,
        })


class VerseOfDayView(APIView):
    """GET /api/verse-of-the-day/  今日の聖句（日付ベースの決定論的選択）

    ?translation=KJV を渡すと、同じ日付インデックスの節を KJV テキストで返す。
    口語訳の節順序を基準に日付で節を選び、canonical_book / chapter.number / verse.number で対応節を引く。
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
                # 同じ「箇所」を指定翻訳で探す。書の同一性は訳非依存の canonical_book で判定する
                # （book.order はインポート方法により訳ごとにズレうるため基準に使わない）。
                canonical_book = base_verse.chapter.book.canonical_book
                chapter_num = base_verse.chapter.number
                verse_num = base_verse.number
                verse = (
                    Verse.objects.filter(
                        chapter__book__translation=translation,
                        chapter__book__canonical_book=canonical_book,
                        chapter__number=chapter_num,
                        number=verse_num,
                    )
                    .select_related("chapter__book")
                    .first()
                ) if canonical_book else None
                verse = verse or base_verse  # 指定訳に対応節が無ければ口語訳にフォールバック

            data = VerseOfDaySerializer(verse).data
            tomorrow = today + datetime.timedelta(days=1)
            midnight = timezone.make_aware(datetime.datetime.combine(tomorrow, datetime.time.min))
            ttl = int((midnight - timezone.now()).total_seconds())
            cache.set(cache_key, data, ttl)
        return Response(data)
