"""import_scripture 汎用ローダのテスト。

正規化 JSON を tmp_path に書き出してコマンドを実行し、
Book / Chapter / Verse が正しく作られ、再実行しても冪等なことを確認する。
"""

import json

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from bible.models import Book, Chapter, Verse

pytestmark = pytest.mark.django_db


def _write_json(tmp_path, data) -> str:
    path = tmp_path / "scripture.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return str(path)


def _sample() -> dict:
    return {
        "book": "The Book of Enoch",
        "translation": "R. H. Charles (EN)",
        "order": 700,
        "chapters": [
            {"number": 1, "verses": [
                {"number": 1, "text": "The words of the blessing of Enoch."},
                {"number": 2, "text": "And he took up his parable."},
            ]},
            {"number": 2, "verses": [
                {"number": 1, "text": "Observe ye everything in the heaven."},
            ]},
        ],
    }


def test_import_creates_book_chapters_verses(tmp_path):
    path = _write_json(tmp_path, _sample())
    call_command("import_scripture", path)

    book = Book.objects.get(name="The Book of Enoch", translation="R. H. Charles (EN)")
    assert book.order == 700
    assert book.chapters.count() == 2
    assert Verse.objects.filter(chapter__book=book).count() == 3
    v = Verse.objects.get(chapter__number=1, chapter__book=book, number=2)
    assert v.text == "And he took up his parable."


def test_import_is_idempotent(tmp_path):
    path = _write_json(tmp_path, _sample())
    call_command("import_scripture", path)
    call_command("import_scripture", path)  # 2 回目

    assert Book.objects.filter(name="The Book of Enoch").count() == 1
    assert Chapter.objects.filter(book__name="The Book of Enoch").count() == 2
    assert Verse.objects.filter(chapter__book__name="The Book of Enoch").count() == 3


def test_missing_required_key_raises(tmp_path):
    bad = {"book": "X", "translation": "Y", "order": 1}  # chapters 欠落
    path = _write_json(tmp_path, bad)
    with pytest.raises(CommandError):
        call_command("import_scripture", path)
