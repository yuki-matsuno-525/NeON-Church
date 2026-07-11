"""references API（箇所→各版の書/章/節）のテスト。

- 同じ箇所の複数版を1回で取得できる
- 一部の版に節が無くても正常（その版を除いて返す）
- 未知の slug は 404、slug は在るが章・節が無ければ空配列
- 重複なし・順序が安定・クエリ数が訳数に比例しない
"""

import pytest
from rest_framework.test import APIClient

from bible.models import Chapter, Verse
from tests.factories import make_book

pytestmark = pytest.mark.django_db

# マタイの3版（同じ canonical slug=matthew）。translation でソートされる（order は同一）。
_VERSIONS = [
    ("口語訳", "マタイによる福音書"),
    ("KJV", "Matthew"),
    ("Nestle 1904 (GRC)", "ΚΑΤΑ ΜΑΘΘΑΙΟΝ"),
]
_SORTED_TRANSLATIONS = ["KJV", "Nestle 1904 (GRC)", "口語訳"]


@pytest.fixture
def api():
    return APIClient()


def _add_verse(book, chapter_num, verse_num, text="x"):
    ch, _ = Chapter.objects.get_or_create(book=book, number=chapter_num)
    return Verse.objects.create(chapter=ch, number=verse_num, text=text)


def _make_matthew(versions=_VERSIONS, *, with_verse=True):
    books = []
    for translation, name in versions:
        b = make_book(name, translation, 1, slug="matthew")
        if with_verse:
            _add_verse(b, 3, 16)
        books.append(b)
    return books


def test_verses_returns_all_versions(api):
    _make_matthew()
    res = api.get("/api/references/matthew/verses/3/16/")

    assert res.status_code == 200
    data = res.json()
    assert data["reference"] == {"book": "matthew", "chapter": 3, "verse": 16}
    translations = [v["translation"] for v in data["verses"]]
    assert translations == _SORTED_TRANSLATIONS          # 順序が安定
    ids = [v["id"] for v in data["verses"]]
    assert len(ids) == len(set(ids))                     # 重複なし


def test_verse_missing_in_a_version(api):
    b_ja = make_book("マタイによる福音書", "口語訳", 1, slug="matthew")
    b_kjv = make_book("Matthew", "KJV", 1, slug="matthew")
    _add_verse(b_ja, 3, 16)
    Chapter.objects.create(book=b_kjv, number=3)  # KJV は章はあるが 16 節なし

    res = api.get("/api/references/matthew/verses/3/16/")

    assert res.status_code == 200
    assert [v["translation"] for v in res.json()["verses"]] == ["口語訳"]


def test_unknown_slug_returns_404(api):
    res = api.get("/api/references/nonexistent/verses/1/1/")
    assert res.status_code == 404


def test_valid_slug_but_no_matching_verse_returns_empty(api):
    _make_matthew()
    res = api.get("/api/references/matthew/verses/99/99/")
    assert res.status_code == 200
    assert res.json()["verses"] == []


def test_chapters_returns_all_versions(api):
    _make_matthew()
    res = api.get("/api/references/matthew/chapters/3/")

    assert res.status_code == 200
    data = res.json()
    assert data["reference"] == {"book": "matthew", "chapter": 3}
    assert [c["translation"] for c in data["chapters"]] == _SORTED_TRANSLATIONS


def test_books_returns_all_versions(api):
    _make_matthew(with_verse=False)
    res = api.get("/api/references/matthew/books/")

    assert res.status_code == 200
    data = res.json()
    assert data["reference"] == {"book": "matthew"}
    assert [b["translation"] for b in data["books"]] == _SORTED_TRANSLATIONS


def test_query_count_independent_of_translations(api, django_assert_num_queries):
    # 2版でも3版でもクエリ数は同じ（訳数に比例しない）
    _make_matthew(_VERSIONS[:2])
    with django_assert_num_queries(2):
        api.get("/api/references/matthew/verses/3/16/")

    # 版を増やしても同じクエリ数
    b_grc = make_book(_VERSIONS[2][1], _VERSIONS[2][0], 1, slug="matthew")
    _add_verse(b_grc, 3, 16)
    with django_assert_num_queries(2):
        api.get("/api/references/matthew/verses/3/16/")
