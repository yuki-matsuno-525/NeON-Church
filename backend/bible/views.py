import datetime

from django.core.cache import cache
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from comments.serializers import CommentSearchSerializer
from common.schema import DetailSerializer

from . import selectors
from .models import Book, Chapter
from .serializers import (
    BookSerializer,
    ChapterSerializer,
    ReferenceBookReadResponseSerializer,
    ReferenceBooksResponseSerializer,
    ReferenceChaptersResponseSerializer,
    ReferenceReadResponseSerializer,
    ReferenceVersesResponseSerializer,
    SearchResponseSerializer,
    VerseOfDaySerializer,
    VerseSearchSerializer,
    VerseSerializer,
)

SEARCH_KINDS = {"all", "verses", "books", "comments"}


def _min_query_len(q: str) -> int:
    """検索クエリの最小文字数。CJK（かな・漢字）は1文字でも語として成立するため1、
    ラテン等はノイズを抑えるため2を要求する（例: 「神」は1文字で検索可能）。"""
    for ch in q:
        # ひらがな・カタカナ(぀-ヿ) または CJK統合漢字(一-鿿)
        if "぀" <= ch <= "ヿ" or "一" <= ch <= "鿿":
            return 1
    return 2


# 聖書本文はインポート済みで基本的に変わらないのに、開くたび DB から作り直していた。
# ブラウザと中間キャッシュに持たせておく時間（1時間）。訳を足したときは最大1時間で反映される。
_SCRIPTURE_CACHE_SECONDS = 60 * 60


class _CacheableScriptureView:
    """本文系の読み取り専用ビューに Cache-Control を付けるための共通処理。

    ログイン状態で内容が変わらないもの（誰が見ても同じ本文）にだけ使う。
    """

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if request.method == "GET" and response.status_code == 200:
            response["Cache-Control"] = f"public, max-age={_SCRIPTURE_CACHE_SECONDS}"
        return response


class BookListView(_CacheableScriptureView, generics.ListAPIView):
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


class ChapterListView(_CacheableScriptureView, generics.ListAPIView):
    """指定した書の章一覧。書が存在しない場合は 404。"""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    serializer_class = ChapterSerializer

    def get_queryset(self):
        # book_id が存在しない場合は 404 を返す
        book = generics.get_object_or_404(Book, pk=self.kwargs["book_id"])
        return selectors.chapters_of(book)


class VerseListView(_CacheableScriptureView, generics.ListAPIView):
    """指定した章の節一覧。章が存在しない場合は 404。"""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    serializer_class = VerseSerializer

    def get_queryset(self):
        chapter = generics.get_object_or_404(Chapter, pk=self.kwargs["chapter_id"])
        return selectors.verses_of(chapter)


class _ReferenceView(_CacheableScriptureView, APIView):
    """箇所（canonical_book.slug）から、各版（訳）の書/章/節をまとめて返す基底。

    フロントの N+1（訳ごとに書→章→節を取得）を1回の問い合わせに置き換えるための API。
    未知の slug は 404、slug は在るが該当章・節が無ければ空配列（版によって節が無いのは正常）。
    Comment/Bookmark の構造は変更しない（本 API は読み取り専用）。
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def _require_slug(self, slug: str) -> None:
        selectors.require_canonical_slug(slug)


class ReferenceBooksView(_ReferenceView):
    """GET /api/references/<slug>/books/  その書の全版の書 id。"""

    @extend_schema(responses={200: ReferenceBooksResponseSerializer})
    def get(self, request, slug):
        self._require_slug(slug)
        books = selectors.books_for_slug(slug)
        return Response(
            {
                "reference": {"book": slug},
                "books": [{"id": str(b.id), "translation": b.translation} for b in books],
            }
        )


class ReferenceChaptersView(_ReferenceView):
    """GET /api/references/<slug>/chapters/<chapter>/  その章の全版の章 id。"""

    @extend_schema(responses={200: ReferenceChaptersResponseSerializer})
    def get(self, request, slug, chapter):
        self._require_slug(slug)
        chapters = selectors.chapters_for_slug(slug, chapter)
        return Response(
            {
                "reference": {"book": slug, "chapter": chapter},
                "chapters": [
                    {"id": str(c.id), "translation": c.book.translation} for c in chapters
                ],
            }
        )


class ReferenceBookReadView(_ReferenceView):
    """GET /api/references/<slug>/book/?translation=口語訳

    書のページ（章番号のグリッド）が必要な「書と、その全章」を1回で返す。
    こちらも以前は books → chapters の2往復で、1回目は全書一覧を落としていた。
    """

    @extend_schema(responses={200: ReferenceBookReadResponseSerializer})
    def get(self, request, slug):
        self._require_slug(slug)
        book = selectors.book_for_translation(slug, request.query_params.get("translation"))
        chapters = selectors.chapters_of(book)
        return Response(
            {
                "reference": {"book": slug},
                "book": BookSerializer(book).data,
                "chapters": ChapterSerializer(chapters, many=True).data,
            }
        )


class ReferenceReadView(_ReferenceView):
    """GET /api/references/<slug>/read/<chapter>/?translation=口語訳

    読書画面が1章を表示するのに必要な「書・章・節」をまとめて1回で返す。

    以前フロントは books → chapters → verses と3回、しかも順番待ちで叩いていた。
    最初の1回は書の全一覧を落として目当ての1冊を探すだけだったので、章を開くたびに
    無駄な往復と転送が発生していた。ここで1回にまとめる。

    見つからないときは 404 に `code` を付けて、画面が「その訳にこの書が無い」のか
    「その章が無い」のかを言い分けられるようにする。
    """

    @extend_schema(responses={200: ReferenceReadResponseSerializer})
    def get(self, request, slug, chapter):
        self._require_slug(slug)
        book = selectors.book_for_translation(slug, request.query_params.get("translation"))
        chapter_obj = selectors.chapter_of(book, chapter)
        verses = selectors.verses_of(chapter_obj)
        return Response(
            {
                "reference": {"book": slug, "chapter": chapter},
                "book": BookSerializer(book).data,
                "chapter": ChapterSerializer(chapter_obj).data,
                "verses": VerseSerializer(verses, many=True).data,
            }
        )


class ReferenceVersesView(_ReferenceView):
    """GET /api/references/<slug>/verses/<chapter>/<verse>/  その節の全版の節 id。"""

    @extend_schema(responses={200: ReferenceVersesResponseSerializer})
    def get(self, request, slug, chapter, verse):
        self._require_slug(slug)
        verses = selectors.verses_for_slug(slug, chapter, verse)
        return Response(
            {
                "reference": {"book": slug, "chapter": chapter, "verse": verse},
                "verses": [
                    {"id": str(v.id), "translation": v.chapter.book.translation} for v in verses
                ],
            }
        )


class SearchView(APIView):
    """GET /api/search/?q=&page=&kind=&book=  節テキスト・書名・コメントを icontains で検索。

    - 検索対象は SEARCH_TRANSLATIONS の全訳。UI 言語では絞らない（検索語が言語を選ぶ）。
    - kind（all/verses/books/comments）で返すセクションを絞る。
    - book（canonical_book.slug）で書を絞る。
    - 節は page でページングする（1冊が上位を独占しても、後続ページで全書に到達できる）。
      books / comments は1ページ目のプレビュー用（ページングしない）。
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []
    VERSE_PAGE_SIZE = 50

    @extend_schema(responses={200: SearchResponseSerializer})
    def get(self, request):
        q = request.query_params.get("q", "").strip()
        kind = request.query_params.get("kind", "all")
        if kind not in SEARCH_KINDS:
            kind = "all"
        book_slug = request.query_params.get("book", "").strip()
        try:
            page = max(1, int(request.query_params.get("page", "1")))
        except ValueError:
            page = 1
        if len(q) < _min_query_len(q):
            return Response(
                {"verses": [], "books": [], "comments": [], "verse_total": 0, "has_more": False}
            )

        verses_qs = selectors.search_verses(q, book_slug)
        if kind in ("all", "verses"):
            verse_total = verses_qs.count()
            start = (page - 1) * self.VERSE_PAGE_SIZE
            verses = verses_qs[start : start + self.VERSE_PAGE_SIZE]
            has_more = start + self.VERSE_PAGE_SIZE < verse_total
        else:
            verse_total = 0
            verses = []
            has_more = False

        # 書名・コメントは1ページ目のプレビュー（ページングしない）。
        books = selectors.search_books(q, book_slug)[:20] if kind in ("all", "books") else []
        comments = (
            selectors.search_comments(q, book_slug)[:20] if kind in ("all", "comments") else []
        )

        return Response(
            {
                "verses": VerseSearchSerializer(verses, many=True).data,
                "books": BookSerializer(books, many=True).data,
                "comments": CommentSearchSerializer(comments, many=True).data,
                "verse_total": verse_total,
                "has_more": has_more,
            }
        )


class VerseOfDayView(APIView):
    """GET /api/verse-of-the-day/  今日の聖句（日付ベースの決定論的選択）

    ?translation=KJV を渡すと、同じ日付インデックスの節を KJV テキストで返す。
    口語訳の節順序を基準に日付で節を選び、canonical_book / chapter.number / verse.number で対応節を引く。
    """

    permission_classes = [AllowAny]
    # 認証不要の公開エンドポイント。壊れた/期限切れの Cookie を送られても 401 にせず、
    # トークンを完全に無視する（iOS Safari の ITP でクッキーが部分的に破損する症状対策）。
    authentication_classes: list = []

    @extend_schema(responses={200: VerseOfDaySerializer, 503: DetailSerializer})
    def get(self, request):
        translation = request.query_params.get("translation", "口語訳")
        today = timezone.localdate()
        cache_key = f"verse_of_day_{translation}_{today.isoformat()}"
        data = cache.get(cache_key)
        if data is None:
            day_of_year = today.timetuple().tm_yday
            # 常に口語訳を基準に「今日の節」の位置を決める
            count = selectors.base_verse_count()
            if count == 0:
                return Response({"detail": "Bible data not found."}, status=503)
            base_verse = selectors.verse_of_day_source((day_of_year - 1) % count)

            if translation == "口語訳":
                verse = base_verse
            else:
                # 指定訳に対応する節が無ければ口語訳にそのまま倒す。
                verse = selectors.same_verse_in(translation, base_verse) or base_verse

            data = VerseOfDaySerializer(verse).data
            tomorrow = today + datetime.timedelta(days=1)
            midnight = timezone.make_aware(datetime.datetime.combine(tomorrow, datetime.time.min))
            ttl = int((midnight - timezone.now()).total_seconds())
            cache.set(cache_key, data, ttl)
        return Response(data)
