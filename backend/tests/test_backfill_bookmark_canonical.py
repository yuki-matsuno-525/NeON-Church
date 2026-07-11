"""backfill_bookmark_canonical コマンドのテスト（段階5B）。

verse 栞に箇所を埋める／冪等／dry-run／comment 栞は不変／箇所重複で安全停止。
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

from bible.models import Chapter, Verse
from bookmarks.models import Bookmark
from comments.models import Comment
from tests.factories import make_book

pytestmark = pytest.mark.django_db
User = get_user_model()

MATT_JA = ("マタイによる福音書", "口語訳", "matthew")
MATT_KJV = ("Matthew", "KJV", "matthew")


def _user(username="u1"):
    return User.objects.create_user(username=username, password="pass12345")


def _verse(book_spec, chapter_num, verse_num):
    name, translation, slug = book_spec
    book = make_book(name, translation, 1, slug=slug)
    ch, _ = Chapter.objects.get_or_create(book=book, number=chapter_num)
    return Verse.objects.create(chapter=ch, number=verse_num, text="x")


def test_backfill_fills_location():
    u = _user()
    v = _verse(MATT_JA, 3, 16)
    bm = Bookmark.objects.create(user=u, verse=v)

    call_command("backfill_bookmark_canonical")

    bm.refresh_from_db()
    assert bm.canonical_book.slug == "matthew"
    assert bm.chapter_number == 3
    assert bm.verse_number == 16


def test_idempotent():
    u = _user()
    v = _verse(MATT_JA, 3, 16)
    Bookmark.objects.create(user=u, verse=v)

    call_command("backfill_bookmark_canonical")
    call_command("backfill_bookmark_canonical")  # 2回目でも壊れない

    assert Bookmark.objects.filter(verse__isnull=False, canonical_book__isnull=True).count() == 0


def test_dry_run_persists_nothing():
    u = _user()
    v = _verse(MATT_JA, 3, 16)
    bm = Bookmark.objects.create(user=u, verse=v)

    call_command("backfill_bookmark_canonical", dry_run=True)

    bm.refresh_from_db()
    assert bm.canonical_book_id is None
    assert bm.chapter_number is None
    assert bm.verse_number is None


def test_comment_bookmark_untouched():
    u = _user()
    author = _user("author")
    v = _verse(MATT_JA, 3, 16)
    comment = Comment.objects.create(user=author, verse=v, body="hi")
    bm = Bookmark.objects.create(user=u, comment=comment)

    call_command("backfill_bookmark_canonical")

    bm.refresh_from_db()
    assert bm.canonical_book_id is None
    assert bm.chapter_number is None
    assert bm.verse_number is None


def test_duplicate_location_stops_safely():
    # 同じユーザーが同じ箇所(matthew 1:1)を 2訳で栞 → 箇所ベースで重複
    u = _user()
    v_ja = _verse(MATT_JA, 1, 1)
    v_kjv = _verse(MATT_KJV, 1, 1)
    Bookmark.objects.create(user=u, verse=v_ja)
    Bookmark.objects.create(user=u, verse=v_kjv)

    with pytest.raises(CommandError, match="重複"):
        call_command("backfill_bookmark_canonical")

    # 途中保存せずロールバック（両方 NULL のまま）
    assert Bookmark.objects.filter(canonical_book__isnull=False).count() == 0
