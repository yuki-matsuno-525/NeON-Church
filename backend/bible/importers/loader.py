"""正規化スキーマ（book/translation/order/chapters/verses）を DB へ投入する共通処理。

management コマンド（import_scripture / import_others）から呼ぶ。処理は冪等で、
get_or_create と bulk_create(ignore_conflicts=True) により何度実行しても安全。
"""

from __future__ import annotations

from django.db import transaction

from bible.canonical import get_or_create_book_with_canonical
from bible.models import Book, Chapter, Verse

REQUIRED_KEYS = ("book", "translation", "order", "chapters")


@transaction.atomic
def load_book(data: dict) -> tuple[Book, bool, int]:
    """正規化データ 1 冊分を投入する。

    戻り値: (book, created, 投入した節数)
    """
    missing = [k for k in REQUIRED_KEYS if k not in data]
    if missing:
        raise ValueError(f"JSON に必須キーがありません: {missing}")

    book, created = get_or_create_book_with_canonical(
        name=data["book"],
        translation=data["translation"],
        order=data["order"],
    )

    total_verses = 0
    for ch in data["chapters"]:
        chapter, _ = Chapter.objects.get_or_create(book=book, number=ch["number"])
        verses = [
            Verse(chapter=chapter, number=v["number"], text=v["text"])
            for v in ch["verses"]
        ]
        created_verses = Verse.objects.bulk_create(
            verses, batch_size=1000, ignore_conflicts=True
        )
        total_verses += len(created_verses)

    return book, created, total_verses
