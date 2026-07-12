"""テスト用ファクトリ。

Book は必ず CanonicalBook 付きで作る（段階3D の NOT NULL 化に備え、テストデータも
canonical を持たせておく）。slug は明示指定（同じ書の複数訳は同じ slug を渡すと同一
CanonicalBook にぶら下がる）。
"""

from bible.models import Book, CanonicalBook


def make_book(name: str, translation: str, order: int, *, slug: str) -> Book:
    canon, _ = CanonicalBook.objects.get_or_create(slug=slug)
    return Book.objects.create(
        name=name,
        translation=translation,
        order=order,
        canonical_book=canon,
    )


def make_comment(*, user, verse=None, chapter=None, book=None, **kwargs):
    """段階6F: Comment は箇所（canonical_book/章/節）＋投稿時訳で保存する。
    テストは verse/chapter/book のいずれかを渡すと、そこから箇所を導出して作成する。
    """
    from comments.models import Comment

    if verse is not None:
        b = verse.chapter.book
        loc = dict(canonical_book=b.canonical_book, chapter_number=verse.chapter.number,
                   verse_number=verse.number, source_translation=b.translation)
    elif chapter is not None:
        b = chapter.book
        loc = dict(canonical_book=b.canonical_book, chapter_number=chapter.number,
                   verse_number=None, source_translation=b.translation)
    elif book is not None:
        loc = dict(canonical_book=book.canonical_book, chapter_number=None,
                   verse_number=None, source_translation=book.translation)
    else:
        loc = {}
    return Comment.objects.create(user=user, **loc, **kwargs)
