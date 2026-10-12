"""どの版（訳）で見せるかの共通ルール（bible.editions.pick_edition）のテスト。

同じ選び方が本文 API・記事の引用・プランの書名の3箇所に散っていたので1つにまとめた。
「まだ本文を入れていない訳を選んでも読めなくならない」ことがこの関数の役目。
"""

import pytest

from bible.editions import pick_edition
from tests.factories import make_book

pytestmark = pytest.mark.django_db


@pytest.fixture
def editions():
    return [
        make_book("Matthew", "KJV", 2, slug="matthew"),
        make_book("マタイによる福音書", "口語訳", 1, slug="matthew"),
        make_book("ΚΑΤΑ ΜΑΘΘΑΙΟΝ", "TR (GRC)", 3, slug="matthew"),
    ]


def test_picks_the_requested_translation(editions):
    assert pick_edition(editions, "TR (GRC)").translation == "TR (GRC)"


def test_falls_back_to_the_default_translation(editions):
    # まだ収録していない訳を頼まれても、口語訳で読ませる。
    assert pick_edition(editions, "存在しない訳").translation == "口語訳"


def test_falls_back_to_the_default_when_nothing_is_requested(editions):
    assert pick_edition(editions, None).translation == "口語訳"
    assert pick_edition(editions, "").translation == "口語訳"


def test_falls_back_to_the_first_edition_without_the_default():
    # 英訳しか無い書（エノク書など）。口語訳が無いので order が最小の版になる。
    books = [
        make_book("Enoch", "R. H. Charles (EN)", 5, slug="enoch"),
        make_book("Enoch", "KJV", 2, slug="enoch"),
    ]
    assert pick_edition(books, "存在しない訳").translation == "KJV"


def test_returns_none_when_there_is_no_edition():
    assert pick_edition([], "口語訳") is None


def test_accepts_a_queryset(editions):
    from bible.models import Book

    assert pick_edition(Book.objects.all(), "KJV").translation == "KJV"


@pytest.fixture
def english_screen():
    """英語の画面からのリクエストの最中、という状態を作る。"""
    from common.language import _ui_language

    token = _ui_language.set("en")
    yield
    _ui_language.reset(token)


def test_english_screen_falls_back_to_kjv(editions, english_screen):
    # 英語の画面では、訳の指定が無ければ KJV の書名・本文にする（日本語の書名を出さない）。
    assert pick_edition(editions, None).translation == "KJV"
    assert pick_edition(editions, "存在しない訳").translation == "KJV"
    # 指定があればそれが優先
    assert pick_edition(editions, "口語訳").translation == "口語訳"


def test_english_screen_without_kjv_uses_the_default(english_screen):
    books = [
        make_book("創世記", "口語訳", 1, slug="genesis"),
        make_book("Γένεση", "LXX (GRC)", 2, slug="genesis"),
    ]
    assert pick_edition(books, None).translation == "口語訳"
