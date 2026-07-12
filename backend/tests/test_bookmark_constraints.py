"""Bookmark の箇所制約テスト（段階5E で追加、5F で verse FK 撤去後の形）。

- 部分ユニーク unique_user_location_bookmark（同一ユーザー・同一箇所の重複禁止）
- CHECK bookmark_comment_xor_location（comment 栞 と 箇所栞 の排他・all-or-none）
- (user, comment) 部分ユニークが壊れていないこと
"""

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from bible.models import Chapter, Verse
from bookmarks.models import Bookmark
from comments.models import Comment
from tests.factories import make_book

pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def data():
    user = User.objects.create_user(username="u1", password="pass12345")
    book = make_book("マタイによる福音書", "口語訳", 1, slug="matthew")
    ch = Chapter.objects.create(book=book, number=3)
    verse = Verse.objects.create(chapter=ch, number=16, text="x")
    return {"user": user, "canon": book.canonical_book, "verse": verse}


def _create(**kwargs) -> Bookmark:
    with transaction.atomic():
        return Bookmark.objects.create(**kwargs)


def _comment(data) -> Comment:
    from tests.factories import make_comment
    author = User.objects.create_user(username="author", password="pass12345")
    return make_comment(user=author, verse=data["verse"], body="hi")


# --- 成功ケース ---

def test_location_bookmark_ok(data):
    # 5F 後の形（verse FK なし・comment なし・箇所あり）
    bm = _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)
    assert bm.pk


def test_comment_bookmark_ok(data):
    bm = _create(user=data["user"], comment=_comment(data))
    assert bm.pk
    assert bm.canonical_book_id is None


def test_same_location_different_users_ok(data):
    u2 = User.objects.create_user(username="u2", password="pass12345")
    _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)
    bm2 = _create(user=u2, canonical_book=data["canon"], chapter_number=3, verse_number=16)
    assert bm2.pk


# --- 失敗ケース（IntegrityError） ---

def test_duplicate_location_same_user_fails(data):
    _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)
    with pytest.raises(IntegrityError):
        _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)


def test_only_canonical_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"], canonical_book=data["canon"])


def test_canonical_and_chapter_only_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"], canonical_book=data["canon"], chapter_number=3)


def test_one_location_col_null_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=None)


def test_comment_and_location_both_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"], comment=_comment(data),
                canonical_book=data["canon"], chapter_number=3, verse_number=16)


def test_no_comment_no_location_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"])  # comment なし・箇所3列すべて NULL


# --- 既存制約が壊れていない ---

def test_user_comment_unique_still_enforced(data):
    comment = _comment(data)
    _create(user=data["user"], comment=comment)
    with pytest.raises(IntegrityError):
        _create(user=data["user"], comment=comment)
