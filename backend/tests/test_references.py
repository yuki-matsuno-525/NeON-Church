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
    assert translations == _SORTED_TRANSLATIONS  # 順序が安定
    ids = [v["id"] for v in data["verses"]]
    assert len(ids) == len(set(ids))  # 重複なし


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


# ------------------------------------------------------------------
# 読書画面用のまとめ取得
#
# 以前は books → chapters → verses と3回、しかも順番待ちで叩いていた。
# 1回で書・章・節が揃うこと、見つからない理由を言い分けられることを検証する。
# ------------------------------------------------------------------
def test_read_returns_book_chapter_and_verses_in_one_call(api):
    _make_matthew()
    res = api.get("/api/references/matthew/read/3/", {"translation": "口語訳"})

    assert res.status_code == 200
    data = res.json()
    assert data["reference"] == {"book": "matthew", "chapter": 3}
    assert data["book"]["translation"] == "口語訳"
    assert data["book"]["name"] == "マタイによる福音書"
    assert data["chapter"]["number"] == 3
    assert [v["number"] for v in data["verses"]] == [16]


def test_read_picks_the_requested_translation(api):
    _make_matthew()
    res = api.get("/api/references/matthew/read/3/", {"translation": "KJV"})

    assert res.status_code == 200
    assert res.json()["book"]["name"] == "Matthew"


def test_read_without_translation_falls_back_to_any_version(api):
    _make_matthew()
    res = api.get("/api/references/matthew/read/3/")

    assert res.status_code == 200
    assert res.json()["book"]["translation"] in _SORTED_TRANSLATIONS


def test_read_unknown_slug_is_404(api):
    _make_matthew()
    assert api.get("/api/references/nosuchbook/read/3/").status_code == 404


def test_read_missing_translation_says_book_not_found(api):
    # 「その訳にこの書が無い」と「その章が無い」を画面が言い分けられるよう code を返す。
    _make_matthew()
    res = api.get("/api/references/matthew/read/3/", {"translation": "存在しない訳"})

    assert res.status_code == 404
    assert res.json()["code"] == "book_not_found"


def test_read_missing_chapter_says_chapter_not_found(api):
    _make_matthew()
    res = api.get("/api/references/matthew/read/99/", {"translation": "口語訳"})

    assert res.status_code == 404
    assert res.json()["code"] == "chapter_not_found"


def test_book_read_returns_book_and_all_chapters(api):
    books = _make_matthew()
    ja = books[0]
    _add_verse(ja, 4, 1)  # 章をもう1つ増やす

    res = api.get("/api/references/matthew/book/", {"translation": "口語訳"})

    assert res.status_code == 200
    data = res.json()
    assert data["book"]["name"] == "マタイによる福音書"
    assert sorted(c["number"] for c in data["chapters"]) == [3, 4]


def test_book_read_missing_translation_is_404(api):
    _make_matthew()
    res = api.get("/api/references/matthew/book/", {"translation": "存在しない訳"})

    assert res.status_code == 404
    assert res.json()["code"] == "book_not_found"


# ------------------------------------------------------------------
# 本文まわりのキャッシュ指示
#
# 聖書本文は取り込み済みで基本的に変わらないのに、開くたび DB から作り直していた。
# ブラウザに持たせてよいことを伝える（ログイン状態で内容は変わらない）。
# ------------------------------------------------------------------
def test_scripture_endpoints_are_cacheable(api):
    books = _make_matthew()
    ja = books[0]
    chapter = ja.chapters.first()

    for url in (
        "/api/books/",
        f"/api/books/{ja.id}/chapters/",
        f"/api/chapters/{chapter.id}/verses/",
        "/api/references/matthew/books/",
        "/api/references/matthew/read/3/",
    ):
        res = api.get(url)
        assert res.status_code == 200, url
        assert "max-age" in res["Cache-Control"], url
        assert res["Cache-Control"].startswith("public"), url
