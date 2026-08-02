"""箇所（書・章・節）を扱う共通ヘルパー。

コメント・Q&A・お気に入り・記事はどれも「訳非依存の書（CanonicalBook）＋章番号＋節番号」で
箇所を持つ。その導出と表示をここに集める（各アプリで書き写さない）。
"""

from .models import Book


def derive_location(*, verse=None, chapter=None, book=None) -> dict | None:
    """verse / chapter / book（いずれか1つ）から箇所と投稿時訳を導出する。

    フロントから届くのは表示中の訳の Verse/Chapter/Book id なので、それを訳非依存の
    箇所へ翻訳するのがこの関数の役目。返り値はモデルの列名そのままなので
    `Model(**derive_location(verse=v))` の形で使える。

    source_translation は Book.translation の値をそのまま入れる（加工しない）。
    どれも渡されなければ None を返す。
    """
    if verse is not None:
        b = verse.chapter.book
        return {
            "canonical_book": b.canonical_book,
            "chapter_number": verse.chapter.number,
            "verse_number": verse.number,
            "source_translation": b.translation,
        }
    if chapter is not None:
        b = chapter.book
        return {
            "canonical_book": b.canonical_book,
            "chapter_number": chapter.number,
            "verse_number": None,
            "source_translation": b.translation,
        }
    if book is not None:
        return {
            "canonical_book": book.canonical_book,
            "chapter_number": None,
            "verse_number": None,
            "source_translation": book.translation,
        }
    return None


def location_filter(*, book_slug: str, chapter_number=None, verse_number=None) -> dict:
    """slug（＋章・節）を queryset の filter 条件へ変換する。

    指定の細かさで粒度が決まる：slug だけ＝書、＋章＝章、＋章＋節＝節。
    「章コメントを取りたいのに節コメントまで混ざる」のを防ぐため、指定しなかった
    ところは明示的に NULL で絞る。
    """
    loc: dict = {"canonical_book__slug": book_slug}
    if verse_number:
        loc["chapter_number"] = chapter_number
        loc["verse_number"] = verse_number
    elif chapter_number:
        loc["chapter_number"] = chapter_number
        loc["verse_number__isnull"] = True
    else:
        loc["chapter_number__isnull"] = True
        loc["verse_number__isnull"] = True
    return loc


def book_name_for(canonical_book_id, source_translation, cache: dict | None = None) -> str:
    """箇所の書名を、投稿時に見ていた訳の呼び名で返す。

    同じ書でも訳ごとに名前が違う（マタイによる福音書 / Matthew）ので、投稿時訳に
    一致する Book の名前を優先する。見つからなければ同じ書のいずれかの版名、
    それも無ければ slug。

    書名の引き当ては Book テーブルへの問い合わせが要るうえ、1件ごとに何度も呼ばれる。
    `cache` に辞書を渡すと同じ組を使い回す（1リクエストのあいだ共有する用）。
    """
    if not canonical_book_id:
        return ""

    key = (canonical_book_id, source_translation)
    if cache is not None and key in cache:
        return cache[key]

    book = (
        Book.objects.filter(
            canonical_book_id=canonical_book_id, translation=source_translation
        ).first()
        or Book.objects.filter(canonical_book_id=canonical_book_id).first()
    )
    if book:
        name = book.name
    else:
        from .models import CanonicalBook

        cb = CanonicalBook.objects.filter(id=canonical_book_id).first()
        name = cb.slug if cb else ""
    if cache is not None:
        cache[key] = name
    return name


def format_location_label(book: str, chapter: int | None, verse: int | None) -> str:
    """書名・章番号・節番号を「マタイ 1章 1節」形式の文字列にする。"""
    if verse is not None:
        return f"{book} {chapter}章 {verse}節"
    if chapter is not None:
        return f"{book} {chapter}章"
    return book
