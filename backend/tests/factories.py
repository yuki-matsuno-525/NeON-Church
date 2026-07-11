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
