"""import_others 一括ローダのテスト。

複数の正規化 JSON をディレクトリに書き出し、--dir 指定でまとめて投入できること、
再実行しても冪等なことを確認する。
"""

import json

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from bible.models import Book, Verse

pytestmark = pytest.mark.django_db


def _book(name, translation, order) -> dict:
    return {
        "book": name,
        "translation": translation,
        "order": order,
        "chapters": [
            {"number": 1, "verses": [{"number": 1, "text": f"{name} 1:1"}]},
            {"number": 2, "verses": [{"number": 1, "text": f"{name} 2:1"}]},
        ],
    }


def _seed_dir(tmp_path):
    d = tmp_path / "others"
    d.mkdir()
    (d / "a.json").write_text(json.dumps(_book("Book A", "T (EN)", 1), ensure_ascii=False), encoding="utf-8")
    (d / "b.json").write_text(json.dumps(_book("Book B", "T (EN)", 2), ensure_ascii=False), encoding="utf-8")
    return d


def test_import_others_loads_all_json(tmp_path):
    d = _seed_dir(tmp_path)
    call_command("import_others", "--dir", str(d))

    assert Book.objects.filter(translation="T (EN)").count() == 2
    assert Verse.objects.filter(chapter__book__name="Book A").count() == 2


def test_import_others_is_idempotent(tmp_path):
    d = _seed_dir(tmp_path)
    call_command("import_others", "--dir", str(d))
    call_command("import_others", "--dir", str(d))

    assert Book.objects.filter(name="Book A").count() == 1
    assert Verse.objects.filter(chapter__book__name="Book A").count() == 2


def test_import_others_empty_dir_raises(tmp_path):
    empty = tmp_path / "empty"
    empty.mkdir()
    with pytest.raises(CommandError):
        call_command("import_others", "--dir", str(empty))
