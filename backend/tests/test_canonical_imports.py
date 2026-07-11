"""段階3C: Book 作成経路の CanonicalBook 対応テスト。

- 共通解決 get_or_create_canonical_book_for / get_or_create_book_with_canonical の挙動
- 空 DB から実インポート（import_scripture → loader.py 経路）で canonical が自動作成される
"""

import json

import pytest
from django.core.management import call_command

from bible.canonical import (
    CanonicalDataError,
    get_or_create_book_with_canonical,
    get_or_create_canonical_book_for,
)
from bible.models import Book, CanonicalBook

pytestmark = pytest.mark.django_db


# --- 共通解決関数 ---

def test_resolver_resolves_known_pair():
    canon = get_or_create_canonical_book_for("口語訳", "マタイによる福音書")
    assert canon.slug == "matthew"
    # 別訳の同じ書は同じ CanonicalBook に解決される（冪等・重複しない）
    again = get_or_create_canonical_book_for("KJV", "Matthew")
    assert again.slug == "matthew"
    assert CanonicalBook.objects.filter(slug="matthew").count() == 1


def test_resolver_raises_for_unknown_pair():
    # 正本に無い (translation, name) は推測せずエラー
    with pytest.raises(CanonicalDataError):
        get_or_create_canonical_book_for("Sahidic Coptic", "Mark")


def test_book_helper_creates_with_canonical():
    book, created = get_or_create_book_with_canonical(name="Matthew", translation="KJV", order=1)
    assert created
    assert book.canonical_book is not None
    assert book.canonical_book.slug == "matthew"


def test_book_helper_backfills_null_canonical():
    # 既存 Book が canonical=NULL のとき、再取り込みで正しく補完される
    Book.objects.create(name="Matthew", translation="KJV", order=1)  # canonical NULL
    book, created = get_or_create_book_with_canonical(name="Matthew", translation="KJV", order=1)
    assert not created
    book.refresh_from_db()
    assert book.canonical_book.slug == "matthew"


def test_book_helper_errors_on_wrong_existing_link():
    # 既存 Book が別の CanonicalBook にリンク済みなら、黙って上書きせずエラー
    wrong = CanonicalBook.objects.create(slug="john")
    Book.objects.create(name="Matthew", translation="KJV", order=1, canonical_book=wrong)
    with pytest.raises(CanonicalDataError):
        get_or_create_book_with_canonical(name="Matthew", translation="KJV", order=1)


# --- 空 DB からの実インポート（loader.py 経路） ---

def _enoch_json(tmp_path) -> str:
    data = {
        "book": "The Book of Enoch",
        "translation": "R. H. Charles (EN)",
        "order": 700,
        "chapters": [
            {"number": 1, "verses": [{"number": 1, "text": "The words of the blessing of Enoch."}]}
        ],
    }
    path = tmp_path / "enoch.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return str(path)


def test_empty_db_import_autocreates_canonical(tmp_path):
    # 空 DB（CanonicalBook 0 件）から始める
    assert CanonicalBook.objects.count() == 0

    call_command("import_scripture", _enoch_json(tmp_path))

    book = Book.objects.get(name="The Book of Enoch", translation="R. H. Charles (EN)")
    assert book.canonical_book.slug == "enoch"
    assert Book.objects.filter(canonical_book__isnull=True).count() == 0


def test_empty_db_import_is_idempotent(tmp_path):
    call_command("import_scripture", _enoch_json(tmp_path))
    call_command("import_scripture", _enoch_json(tmp_path))  # 再実行

    assert Book.objects.filter(name="The Book of Enoch").count() == 1
    assert CanonicalBook.objects.filter(slug="enoch").count() == 1
    assert Book.objects.filter(canonical_book__isnull=True).count() == 0
