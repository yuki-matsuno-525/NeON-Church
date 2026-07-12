"""import_ibibles（ibibles.net テキストの汎用インポータ）のテスト。"""

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from bible.management.commands.import_ibibles import parse_ibibles_text

SAMPLE = """=000 Bible begins
=101 Matthew
Mt 1:1 Mt 1:1 The book of the generation of Jesus Christ.
Mt 1:2 Mt 1:2 Abraham begat Isaac.
Mt 2:1 Mt 2:1 Now when Jesus was born in Bethlehem.
"""


def test_parse_extracts_books_verses_and_strips_dup_ref():
    books = parse_ibibles_text(SAMPLE)
    # 索引 000（本文なし）は落ちる。Matthew だけが残る。
    assert len(books) == 1
    index, name, verses = books[0]
    assert index == "101"
    assert name == "Matthew"
    assert verses[(1, 1)] == "The book of the generation of Jesus Christ."
    assert verses[(1, 2)] == "Abraham begat Isaac."
    assert verses[(2, 1)] == "Now when Jesus was born in Bethlehem."


def _write(tmp_path, text):
    p = tmp_path / "sample.txt"
    p.write_text(text, encoding="utf-8")
    return str(p)


@pytest.mark.django_db
def test_import_creates_book_chapters_verses(tmp_path):
    # canonical_books.json に (KJV, Matthew) -> matthew が登録済みなので解決できる。
    call_command("import_ibibles", "--txt", _write(tmp_path, SAMPLE), "--translation", "KJV")

    from bible.models import Book, Chapter, Verse
    book = Book.objects.get(translation="KJV", name="Matthew")
    assert book.canonical_book.slug == "matthew"
    assert Chapter.objects.filter(book=book).count() == 2
    assert Verse.objects.filter(chapter__book=book).count() == 3
    assert Verse.objects.get(chapter__book=book, chapter__number=1, number=1).text.startswith("The book")


@pytest.mark.django_db
def test_import_is_idempotent(tmp_path):
    path = _write(tmp_path, SAMPLE)
    call_command("import_ibibles", "--txt", path, "--translation", "KJV")
    from bible.models import Verse
    before = Verse.objects.count()
    call_command("import_ibibles", "--txt", path, "--translation", "KJV")
    assert Verse.objects.count() == before


@pytest.mark.django_db
def test_import_unregistered_translation_errors(tmp_path):
    # canonical_books.json に無い訳名は解決できず CommandError。
    with pytest.raises(CommandError):
        call_command("import_ibibles", "--txt", _write(tmp_path, SAMPLE), "--translation", "NONEXISTENT (GRC)")
