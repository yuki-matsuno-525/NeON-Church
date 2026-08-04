"""聖書本文の読み出し。

読書画面と検索が必要とする問い合わせをここに集める。
このアプリは読み取り専用なので services.py は無い。
"""

from django.db.models import QuerySet
from rest_framework.exceptions import NotFound

from .models import Book, CanonicalBook, Chapter, Verse

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


def require_canonical_slug(slug: str) -> None:
    """未知の書 slug なら 404。各参照 API の入口で通す。"""
    if not CanonicalBook.objects.filter(slug=slug).exists():
        raise NotFound("Unknown book.")


def book_for_translation(slug: str, translation: str | None) -> Book:
    """書 slug と訳から Book を1冊決める。

    無ければ 404。`code` を付けて、画面が「その訳にこの書が無い」のか
    「その章が無い」のかを言い分けられるようにする。
    """
    books = Book.objects.filter(canonical_book__slug=slug)
    if translation:
        books = books.filter(translation=translation)
    book = books.order_by("order", "translation").first()
    if book is None:
        raise NotFound({"detail": "Book not found for this translation.", "code": "book_not_found"})
    return book


def chapter_of(book: Book, number) -> Chapter:
    """その書の指定章。無ければ 404。"""
    chapter = Chapter.objects.filter(book=book, number=number).first()
    if chapter is None:
        raise NotFound({"detail": "Chapter not found.", "code": "chapter_not_found"})
    return chapter


def books_for_slug(slug: str) -> QuerySet:
    """その書の全版。訳の切り替えに使う。"""
    return Book.objects.filter(canonical_book__slug=slug).order_by("order", "translation")


def chapters_for_slug(slug: str, number) -> QuerySet:
    """その章の全版。"""
    return (
        Chapter.objects.filter(book__canonical_book__slug=slug, number=number)
        .select_related("book")
        .order_by("book__order", "book__translation")
    )


def verses_for_slug(slug: str, chapter_number, verse_number) -> QuerySet:
    """その節の全版。"""
    return (
        Verse.objects.filter(
            chapter__book__canonical_book__slug=slug,
            chapter__number=chapter_number,
            number=verse_number,
        )
        .select_related("chapter__book")
        .order_by("chapter__book__order", "chapter__book__translation")
    )


def chapters_of(book: Book) -> QuerySet:
    return Chapter.objects.filter(book=book)


def verses_of(chapter: Chapter) -> QuerySet:
    return Verse.objects.filter(chapter=chapter)


# ---------------------------------------------------------------------------
# 検索
# ---------------------------------------------------------------------------


def search_verses(query: str, book_slug: str = "") -> QuerySet:
    """本文の検索。代表訳に絞って書順で並べる。"""
    qs = (
        Verse.objects.filter(
            text__icontains=query, chapter__book__translation__in=SEARCH_TRANSLATIONS
        )
        .select_related("chapter__book", "chapter__book__canonical_book")
        .order_by("chapter__book__order", "chapter__number", "number")
    )
    if book_slug:
        qs = qs.filter(chapter__book__canonical_book__slug=book_slug)
    return qs


def search_books(query: str, book_slug: str = "") -> QuerySet:
    """書名の検索。"""
    qs = Book.objects.filter(name__icontains=query, translation__in=SEARCH_TRANSLATIONS).order_by(
        "order"
    )
    if book_slug:
        qs = qs.filter(canonical_book__slug=book_slug)
    return qs


def search_comments(query: str, book_slug: str = "") -> QuerySet:
    """コメントの検索。企画内コメントは混ぜない（見えない人がいるため）。"""
    from comments.models import Comment

    qs = (
        Comment.objects.filter(
            body__icontains=query,
            is_deleted=False,
            parent=None,
            translation_project__isnull=True,
        )
        .select_related("user", "canonical_book")
        .order_by("-created_at")
    )
    if book_slug:
        qs = qs.filter(canonical_book__slug=book_slug)
    return qs


def verse_of_day_source(index: int) -> Verse:
    """今日の節の基準（口語訳の節順）。日付から決まる位置の1節を返す。"""
    return (
        Verse.objects.filter(chapter__book__translation="口語訳")
        .select_related("chapter__book")
        .order_by("chapter__book__order", "chapter__number", "number")[index]
    )


def base_verse_count() -> int:
    """基準となる口語訳の総節数。"""
    return Verse.objects.filter(chapter__book__translation="口語訳").count()


def same_verse_in(translation: str, base_verse: Verse) -> Verse | None:
    """同じ「箇所」を指定訳で探す。

    書の同一性は訳非依存の canonical_book で判定する
    （book.order は取り込み方法により訳ごとにズレうるため基準に使わない）。
    """
    canonical_book = base_verse.chapter.book.canonical_book
    if not canonical_book:
        return None
    return (
        Verse.objects.filter(
            chapter__book__translation=translation,
            chapter__book__canonical_book=canonical_book,
            chapter__number=base_verse.chapter.number,
            number=base_verse.number,
        )
        .select_related("chapter__book")
        .first()
    )
