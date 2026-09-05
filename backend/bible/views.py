import datetime

from django.core.cache import cache
from django.db.models import Count, OuterRef, Subquery
from django.utils import timezone
from django.utils.text import Truncator
from rest_framework import generics
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework.exceptions import NotFound

from comments.models import Comment
from comments.serializers import CommentSearchSerializer
from .editions import DEFAULT_TRANSLATION, pick_edition
from .models import Book, CanonicalBook, Chapter, Verse
from .serializers import BookSerializer, ChapterSerializer, VerseSerializer, VerseOfDaySerializer, VerseSearchSerializer

# 検索対象の訳。UI 言語では絞らない。
#
# 以前は UI 言語ごとに訳を絞っていたため、日本語 UI で「神」を検索してから英語 UI に
# 切り替えると、検索対象が KJV だけになって 0 件になっていた。UI のボタンが何語かという
# 話と、どの言語の本文を探したいかは別の希望なので、両者を切り離す。
#
# 代わりに検索語そのものが言語を選ぶ。「神」は日本語の本文にしか、"god" は英語の本文にしか
# 当たらないので、全訳を対象にしても結果は混ざらない。副次的に、英訳しか無いエノク書などが
# 日本語 UI からも探せるようになる。
#
# ただし同じ言語で同じ書を持つ訳を並べると同一箇所が重複するため、その組は代表1訳に絞る:
#   - 日本語: 口語訳（現代語）を代表とし、文語訳は外す
#   - ギリシャ語新約: TR を代表とし、Nestle 1904 は外す
SEARCH_TRANSLATIONS = [
    "口語訳",
    "KJV",
    "Mark M. Mattison (EN)",
    "R. H. Charles (EN)",
    "L. S. A. Wells (EN)",
    "Samuel Zinner (EN)",
    "L. C. L. Brenton (EN)",
    "TR (GRC)",
    "LXX (GRC)",
    "WLC (HEB)",
]

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


class TranslationListView(_CacheableScriptureView, APIView):
    """GET /api/bible/translations/  実際に本文が入っている訳の一覧。認証不要。

    どの訳が読めるかは、これまでフロントの books.ts に手書きされた宣言だけが持っていた。
    宣言だけ先に足して本文をまだ入れていない訳を選ぶと、その訳が載っている書が
    すべて読めなくなっていたので、実データを答えられる入口をここに作る。

    形: [{"id": "口語訳", "books": 66}, ...]（books は収録済みの書の数）
    """

    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request):
        rows = (
            Book.objects.values("translation")
            .annotate(books=Count("id"))
            .order_by("-books", "translation")
        )
        return Response([{"id": row["translation"], "books": row["books"]} for row in rows])


class ChapterListView(_CacheableScriptureView, generics.ListAPIView):
    """指定した書の章一覧。書が存在しない場合は 404。"""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    serializer_class = ChapterSerializer

    def get_queryset(self):
        # book_id が存在しない場合は 404 を返す
        book = generics.get_object_or_404(Book, pk=self.kwargs["book_id"])
        return Chapter.objects.filter(book=book)


class VerseListView(_CacheableScriptureView, generics.ListAPIView):
    """指定した章の節一覧。章が存在しない場合は 404。"""

    permission_classes = [AllowAny]
    authentication_classes: list = []
    serializer_class = VerseSerializer

    def get_queryset(self):
        chapter = generics.get_object_or_404(Chapter, pk=self.kwargs["chapter_id"])
        return Verse.objects.filter(chapter=chapter)


class _ReferenceView(_CacheableScriptureView, APIView):
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


def _editions_for(slug: str):
    """その箇所に収録されている版（訳）を、表示順に並べて返す。"""
    return list(Book.objects.filter(canonical_book__slug=slug).order_by("order", "translation"))


def _require_edition(editions, translation: str | None):
    """引き当て済みの版一覧から、見せる1冊を決める。

    希望の訳がまだ収録されていなくても 404 にはせず、別の版にたおす（pick_edition）。
    以前はここで 404 を返していたため、books.ts に書いてはあるがまだ本文を入れていない
    訳をいちど選ぶと、その訳が載っているすべての書が読めなくなっていた。
    実際に使った訳はレスポンスの book.translation で分かる。

    404 になるのは「その書の版が1つも無い」ときだけ。
    """
    book = pick_edition(editions, translation)
    if book is None:
        raise NotFound({"detail": "Book not found for this translation.", "code": "book_not_found"})
    return book


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


class ReferenceBookReadView(_ReferenceView):
    """GET /api/references/<slug>/book/?translation=口語訳

    書のページ（章番号のグリッド）が必要な「書と、その全章」を1回で返す。
    こちらも以前は books → chapters の2往復で、1回目は全書一覧を落としていた。
    """

    # 章の書き出しに載せる長さ。1 行に収まる分だけあれば「何の章か」は分かる。
    OPENING_LENGTH = 80

    def get(self, request, slug):
        self._require_slug(slug)
        editions = _editions_for(slug)
        book = _require_edition(editions, request.query_params.get("translation"))
        chapters = Chapter.objects.filter(book=book)
        rows = ChapterSerializer(chapters, many=True).data
        openings = self._openings(book)
        for row in rows:
            row["opening"] = openings.get(row["id"], "")
        return Response({
            "reference": {"book": slug},
            "book": BookSerializer(book).data,
            "chapters": rows,
            "translations": [b.translation for b in editions],
        })

    def _openings(self, book):
        """章ごとの書き出し（いちばん小さい番号の節の頭）を、まとめて 1 回で引く。

        プランを作る人が、章の中身を見ないまま「マルコ 1章」を選ばずに済むようにするため。
        章ごとに問い合わせると 150 章の書で 150 往復になるので、ここで 1 回にまとめる。
        節の番号は 1 から始まらない書があるので、番号の小さいものを各章から 1 つ取る。
        （DISTINCT ON は PostgreSQL 専用でテストの SQLite が動かないため、
          章ごとに「先頭の節」を差し込む形にしてある）
        """
        first_text = (
            Verse.objects.filter(chapter=OuterRef("pk")).order_by("number").values("text")[:1]
        )
        rows = (
            Chapter.objects.filter(book=book)
            .annotate(opening=Subquery(first_text))
            .values_list("id", "opening")
        )
        return {
            str(chapter_id): Truncator(text).chars(self.OPENING_LENGTH) if text else ""
            for chapter_id, text in rows
        }


class ReferenceReadView(_ReferenceView):
    """GET /api/references/<slug>/read/<chapter>/?translation=口語訳

    読書画面が1章を表示するのに必要な「書・章・節」をまとめて1回で返す。

    以前フロントは books → chapters → verses と3回、しかも順番待ちで叩いていた。
    最初の1回は書の全一覧を落として目当ての1冊を探すだけだったので、章を開くたびに
    無駄な往復と転送が発生していた。ここで1回にまとめる。

    見つからないときは 404 に `code` を付けて、画面が「その訳にこの書が無い」のか
    「その章が無い」のかを言い分けられるようにする。
    """

    def get(self, request, slug, chapter):
        self._require_slug(slug)
        editions = _editions_for(slug)
        book = _require_edition(editions, request.query_params.get("translation"))
        chapter_obj = Chapter.objects.filter(book=book, number=chapter).first()
        if chapter_obj is None:
            raise NotFound({"detail": "Chapter not found.", "code": "chapter_not_found"})

        verses = Verse.objects.filter(chapter=chapter_obj)
        return Response({
            "reference": {"book": slug, "chapter": chapter},
            "book": BookSerializer(book).data,
            "chapter": ChapterSerializer(chapter_obj).data,
            "verses": VerseSerializer(verses, many=True).data,
            # 訳の切替に出す候補。宣言ではなく実際に収録されている訳だけを渡す。
            "translations": [b.translation for b in editions],
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
            return Response({"verses": [], "books": [], "comments": [], "verse_total": 0, "has_more": False})

        # 代表訳に絞って書順で並べる（同じ書を重複して持つ訳は除いてあるので重複しない）。
        verses_qs = (
            Verse.objects.filter(text__icontains=q, chapter__book__translation__in=SEARCH_TRANSLATIONS)
            .select_related("chapter__book", "chapter__book__canonical_book")
            .order_by("chapter__book__order", "chapter__number", "number")
        )
        if book_slug:
            verses_qs = verses_qs.filter(chapter__book__canonical_book__slug=book_slug)

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
        books_qs = Book.objects.filter(name__icontains=q, translation__in=SEARCH_TRANSLATIONS).order_by("order")
        comments_qs = (
            Comment.objects.filter(body__icontains=q, is_deleted=False, parent=None, translation_project__isnull=True)
            .select_related("user", "canonical_book")
            .order_by("-created_at")
        )
        if book_slug:
            books_qs = books_qs.filter(canonical_book__slug=book_slug)
            comments_qs = comments_qs.filter(canonical_book__slug=book_slug)
        books = books_qs[:20] if kind in ("all", "books") else []
        comments = comments_qs[:20] if kind in ("all", "comments") else []

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
        translation = request.query_params.get("translation", DEFAULT_TRANSLATION)
        today = timezone.localdate()
        cache_key = f"verse_of_day_{translation}_{today.isoformat()}"
        data = cache.get(cache_key)
        if data is None:
            day_of_year = today.timetuple().tm_yday
            # 常に口語訳を基準に「今日の節」の位置を決める
            base_qs = Verse.objects.filter(chapter__book__translation=DEFAULT_TRANSLATION)
            count = base_qs.count()
            if count == 0:
                return Response({"detail": "Bible data not found."}, status=503)
            index = (day_of_year - 1) % count
            base_verse = (
                base_qs.select_related("chapter__book")
                .order_by("chapter__book__order", "chapter__number", "number")[index]
            )

            if translation == DEFAULT_TRANSLATION:
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
