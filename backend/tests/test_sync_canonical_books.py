"""sync_canonical_books コマンドのテスト。

一時 JSON と一時 Book で、リンク・冪等・dry-run・不一致/曖昧のエラーを確認する。
併せて、実際の正本 canonical_books.json が構造的に妥当なことも確認する。
"""

import json
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from bible.models import Book, CanonicalBook

pytestmark = pytest.mark.django_db

REAL_DATA_PATH = Path(__file__).resolve().parents[1] / "bible" / "data" / "canonical_books.json"


def _write_json(tmp_path, data) -> str:
    path = tmp_path / "canonical_books.json"
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return str(path)


def _make_books(pairs):
    """(translation, name) のリストから Book を作る（order は連番）。"""
    for i, (translation, name) in enumerate(pairs, start=1):
        Book.objects.create(name=name, translation=translation, order=i)


def _sample_json():
    return [
        {"slug": "matthew", "books": [
            {"translation": "口語訳", "name": "マタイによる福音書"},
            {"translation": "KJV", "name": "Matthew"},
        ]},
        {"slug": "mark", "books": [
            {"translation": "口語訳", "name": "マルコによる福音書"},
        ]},
    ]


def _sample_pairs():
    return [
        ("口語訳", "マタイによる福音書"),
        ("KJV", "Matthew"),
        ("口語訳", "マルコによる福音書"),
    ]


def test_links_all_books(tmp_path):
    _make_books(_sample_pairs())
    path = _write_json(tmp_path, _sample_json())

    call_command("sync_canonical_books", path=path)

    assert CanonicalBook.objects.count() == 2
    assert Book.objects.filter(canonical_book__isnull=True).count() == 0
    # 同じ slug に複数訳がぶら下がる
    matthew = CanonicalBook.objects.get(slug="matthew")
    assert matthew.editions.count() == 2


def test_idempotent(tmp_path):
    _make_books(_sample_pairs())
    path = _write_json(tmp_path, _sample_json())

    call_command("sync_canonical_books", path=path)
    call_command("sync_canonical_books", path=path)  # 2回目

    assert CanonicalBook.objects.count() == 2  # 重複が増えない
    assert Book.objects.filter(canonical_book__isnull=True).count() == 0


def test_dry_run_persists_nothing(tmp_path):
    _make_books(_sample_pairs())
    path = _write_json(tmp_path, _sample_json())

    call_command("sync_canonical_books", path=path, dry_run=True)

    assert CanonicalBook.objects.count() == 0
    assert Book.objects.filter(canonical_book__isnull=True).count() == 3


def test_db_book_without_json_entry_errors(tmp_path):
    # JSON に無い Book を1つ追加 → 完全一致を満たさずエラー
    _make_books(_sample_pairs() + [("KJV", "Luke")])
    path = _write_json(tmp_path, _sample_json())

    with pytest.raises(CommandError, match="JSON に定義の無い DB Book"):
        call_command("sync_canonical_books", path=path)
    # 失敗時に中途半端な状態を残さない
    assert Book.objects.filter(canonical_book__isnull=False).count() == 0


def test_json_book_missing_in_db_errors(tmp_path):
    # DB にはマルコが無いのに JSON にはある → エラー
    _make_books([("口語訳", "マタイによる福音書"), ("KJV", "Matthew")])
    path = _write_json(tmp_path, _sample_json())

    with pytest.raises(CommandError, match="DB に存在しない Book"):
        call_command("sync_canonical_books", path=path)


def test_ambiguous_pair_errors(tmp_path):
    _make_books([("口語訳", "マタイによる福音書")])
    # 同じ (translation, name) を2つの slug に割り当て → 曖昧
    data = [
        {"slug": "matthew", "books": [{"translation": "口語訳", "name": "マタイによる福音書"}]},
        {"slug": "dup", "books": [{"translation": "口語訳", "name": "マタイによる福音書"}]},
    ]
    path = _write_json(tmp_path, data)

    with pytest.raises(CommandError, match="重複"):
        call_command("sync_canonical_books", path=path)


def test_empty_books_array_errors(tmp_path):
    _make_books([("口語訳", "マタイによる福音書")])
    data = [{"slug": "matthew", "books": []}]
    path = _write_json(tmp_path, data)

    with pytest.raises(CommandError, match="books 配列が空"):
        call_command("sync_canonical_books", path=path)


def test_real_canonical_books_json_is_valid():
    """実際の正本が構造的に妥当（配列・slug 一意・(訳,名) 一意・books 非空）。"""
    data = json.loads(REAL_DATA_PATH.read_text(encoding="utf-8"))
    assert isinstance(data, list) and data

    slugs = [e["slug"] for e in data]
    assert all(slugs), "空 slug がある"
    assert len(slugs) == len(set(slugs)), "slug が重複"

    pairs = [(b["translation"], b["name"]) for e in data for b in e["books"]]
    assert all(e["books"] for e in data), "空の books 配列がある"
    assert all(t and n for t, n in pairs), "空の translation/name がある"
    assert len(pairs) == len(set(pairs)), "(translation, name) が重複"

    # 現行の収録: 10 canonical / 18 edition
    assert len(slugs) == 10
    assert len(pairs) == 18
