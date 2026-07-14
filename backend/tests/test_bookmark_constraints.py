"""Bookmark の対象制約テスト（書/章/節・コメント・翻訳プロジェクトの排他）。

- 部分ユニーク: 節（unique_user_location_bookmark）/ 章（unique_user_chapter_bookmark）/
  書（unique_user_book_bookmark）/ コメント / プロジェクト
- CHECK bookmark_single_target: 3種（箇所 / comment / project）の排他と、
  箇所栞の入れ子（節があれば章も必須）
"""

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from bible.models import Chapter, Verse
from bookmarks.models import Bookmark
from comments.models import Comment
from translations.models import TranslationProject
from tests.factories import make_book

pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def data():
    user = User.objects.create_user(username="u1", password="pass12345")
    book = make_book("マタイによる福音書", "口語訳", 1, slug="matthew")
    ch = Chapter.objects.create(book=book, number=3)
    verse = Verse.objects.create(chapter=ch, number=16, text="x")
    project = TranslationProject.objects.create(
        name="エノク書 私訳", owner=user, source_book=book, target_language="ja"
    )
    return {"user": user, "canon": book.canonical_book, "verse": verse, "project": project}


def _create(**kwargs) -> Bookmark:
    with transaction.atomic():
        return Bookmark.objects.create(**kwargs)


def _comment(data) -> Comment:
    from tests.factories import make_comment
    author = User.objects.create_user(username="author", password="pass12345")
    return make_comment(user=author, verse=data["verse"], body="hi")


# --- 成功ケース ---

def test_verse_bookmark_ok(data):
    bm = _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)
    assert bm.pk


def test_chapter_bookmark_ok(data):
    # 章栞: 書+章、節は NULL
    bm = _create(user=data["user"], canonical_book=data["canon"], chapter_number=3)
    assert bm.pk
    assert bm.verse_number is None


def test_book_bookmark_ok(data):
    # 書栞: 書のみ、章・節は NULL
    bm = _create(user=data["user"], canonical_book=data["canon"])
    assert bm.pk
    assert bm.chapter_number is None


def test_comment_bookmark_ok(data):
    bm = _create(user=data["user"], comment=_comment(data))
    assert bm.pk
    assert bm.canonical_book_id is None


def test_project_bookmark_ok(data):
    bm = _create(user=data["user"], translation_project=data["project"])
    assert bm.pk
    assert bm.canonical_book_id is None


def test_verse_chapter_book_coexist(data):
    # 同じ書の節栞・章栞・書栞は別粒度なので共存できる
    _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)
    _create(user=data["user"], canonical_book=data["canon"], chapter_number=3)
    _create(user=data["user"], canonical_book=data["canon"])
    assert Bookmark.objects.filter(user=data["user"]).count() == 3


def test_same_location_different_users_ok(data):
    u2 = User.objects.create_user(username="u2", password="pass12345")
    _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)
    bm2 = _create(user=u2, canonical_book=data["canon"], chapter_number=3, verse_number=16)
    assert bm2.pk


# --- 重複（部分ユニーク）失敗ケース ---

def test_duplicate_verse_same_user_fails(data):
    _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)
    with pytest.raises(IntegrityError):
        _create(user=data["user"], canonical_book=data["canon"], chapter_number=3, verse_number=16)


def test_duplicate_chapter_same_user_fails(data):
    _create(user=data["user"], canonical_book=data["canon"], chapter_number=3)
    with pytest.raises(IntegrityError):
        _create(user=data["user"], canonical_book=data["canon"], chapter_number=3)


def test_duplicate_book_same_user_fails(data):
    _create(user=data["user"], canonical_book=data["canon"])
    with pytest.raises(IntegrityError):
        _create(user=data["user"], canonical_book=data["canon"])


def test_duplicate_project_same_user_fails(data):
    _create(user=data["user"], translation_project=data["project"])
    with pytest.raises(IntegrityError):
        _create(user=data["user"], translation_project=data["project"])


# --- CHECK（排他・入れ子）失敗ケース ---

def test_verse_without_chapter_fails(data):
    # 節があるのに章が NULL は不正（書→章→節の入れ子違反）
    with pytest.raises(IntegrityError):
        _create(user=data["user"], canonical_book=data["canon"], verse_number=16)


def test_comment_and_location_both_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"], comment=_comment(data),
                canonical_book=data["canon"], chapter_number=3, verse_number=16)


def test_project_and_location_both_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"], translation_project=data["project"],
                canonical_book=data["canon"], chapter_number=3, verse_number=16)


def test_comment_and_project_both_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"], comment=_comment(data), translation_project=data["project"])


def test_no_target_fails(data):
    with pytest.raises(IntegrityError):
        _create(user=data["user"])  # 対象なし


# --- 既存制約が壊れていない ---

def test_user_comment_unique_still_enforced(data):
    comment = _comment(data)
    _create(user=data["user"], comment=comment)
    with pytest.raises(IntegrityError):
        _create(user=data["user"], comment=comment)
