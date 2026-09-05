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


def test_read_falls_back_when_the_translation_has_no_text(api):
    # まだ本文を入れていない訳を選んでも読めなくならない。既定の訳（口語訳）にたおす。
    # 以前はここが 404 だったため、その訳が載っている書がすべて開けなくなっていた。
    _make_matthew()
    res = api.get("/api/references/matthew/read/3/", {"translation": "存在しない訳"})

    assert res.status_code == 200
    assert res.json()["book"]["translation"] == "口語訳"


def test_read_falls_back_to_first_edition_without_the_default(api):
    # 既定の訳すら無い書（英訳しか無いエノク書など）は、順番が最初の版にたおす。
    _make_matthew(_VERSIONS[1:])
    res = api.get("/api/references/matthew/read/3/", {"translation": "存在しない訳"})

    assert res.status_code == 200
    assert res.json()["book"]["translation"] == "KJV"


def test_read_returns_the_translations_actually_stored(api):
    # 訳の切替に出す候補。フロントの宣言ではなく実データを答える。
    _make_matthew()
    res = api.get("/api/references/matthew/read/3/", {"translation": "口語訳"})

    assert res.json()["translations"] == _SORTED_TRANSLATIONS


def test_read_is_404_only_when_the_book_has_no_edition(api):
    # 版が1冊も無いときだけ book_not_found。canonical だけ在って本文が無い状態。
    from bible.models import CanonicalBook

    CanonicalBook.objects.create(slug="matthew")
    res = api.get("/api/references/matthew/read/3/", {"translation": "口語訳"})

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


def test_book_read_gives_each_chapter_its_opening(api):
    """章の書き出しを返す。プランを作る人が中身を見ないまま章を選ばずに済むようにするため。

    節の番号は 1 から始まらない書があるので、番号のいちばん小さい節を書き出しにする。
    """
    ja = make_book("マタイによる福音書", "口語訳", 1, slug="matthew")
    _add_verse(ja, 1, 2, text="つぎの節")
    _add_verse(ja, 1, 1, text="アブラハムの子であるダビデの子、イエス・キリストの系図。")
    _add_verse(ja, 5, 3, text="こころの貧しい人たちは、さいわいである。")

    res = api.get("/api/references/matthew/book/", {"translation": "口語訳"})

    assert res.status_code == 200
    openings = {c["number"]: c["opening"] for c in res.json()["chapters"]}
    assert openings[1] == "アブラハムの子であるダビデの子、イエス・キリストの系図。"
    assert openings[5] == "こころの貧しい人たちは、さいわいである。"


def test_book_read_shortens_a_long_opening(api):
    ja = make_book("マタイによる福音書", "口語訳", 1, slug="matthew")
    _add_verse(ja, 1, 1, text="あ" * 200)

    res = api.get("/api/references/matthew/book/", {"translation": "口語訳"})

    opening = res.json()["chapters"][0]["opening"]
    assert len(opening) <= 81  # 80 文字＋末尾の「…」
    assert opening.endswith("…")


def test_book_read_leaves_the_opening_empty_when_a_chapter_has_no_verse(api):
    ja = make_book("マタイによる福音書", "口語訳", 1, slug="matthew")
    Chapter.objects.create(book=ja, number=1)

    res = api.get("/api/references/matthew/book/", {"translation": "口語訳"})

    assert res.json()["chapters"][0]["opening"] == ""


def test_book_read_falls_back_when_the_translation_has_no_text(api):
    _make_matthew()
    res = api.get("/api/references/matthew/book/", {"translation": "存在しない訳"})

    assert res.status_code == 200
    data = res.json()
    assert data["book"]["translation"] == "口語訳"
    assert data["translations"] == _SORTED_TRANSLATIONS


# ------------------------------------------------------------------
# 収録済みの訳の一覧
#
# どの訳が読めるかは、これまでフロントの books.ts の手書き宣言しか知らなかった。
# 宣言だけ先に足した訳を選ぶと全部の書が読めなくなっていたので、実データを答える。
# ------------------------------------------------------------------
def test_translation_list_returns_only_stored_translations(api):
    _make_matthew()
    make_book("Enoch", "R. H. Charles (EN)", 1, slug="enoch")

    res = api.get("/api/bible/translations/")

    assert res.status_code == 200
    rows = res.json()
    assert {row["id"] for row in rows} == {"口語訳", "KJV", "Nestle 1904 (GRC)", "R. H. Charles (EN)"}
    # 収録した書の数が多い訳から並ぶ
    assert rows[0]["books"] == 1
    assert all(row["books"] >= 1 for row in rows)


def test_translation_list_is_empty_before_import(api):
    assert api.get("/api/bible/translations/").json() == []


def test_translation_list_is_cacheable(api):
    _make_matthew()
    res = api.get("/api/bible/translations/")
    assert res["Cache-Control"] == "public, max-age=3600"


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
