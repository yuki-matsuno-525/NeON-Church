"""段階6B: backfill_comment_locations コマンドのテスト。

各 Comment 自身の旧 FK（verse/chapter/book）から箇所と投稿時訳を導出して埋める。
既定 dry-run、--apply で更新、冪等、全件検証後に atomic 更新（異常が1件でもあれば全体失敗）。
"""

from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from comments.models import Comment

pytestmark = pytest.mark.django_db

CMD = "backfill_comment_locations"


def _run(*args):
    out = StringIO()
    call_command(CMD, *args, stdout=out)
    return out.getvalue()


@pytest.fixture
def author(django_user_model):
    return django_user_model.objects.create_user(username="c_author", password="pass12345")


@pytest.fixture
def verse2(chapter):
    from bible.models import Verse
    return Verse.objects.create(chapter=chapter, number=2, text="二節目のテキスト")


# ---------------------------------------------------------------
# 1. dry-run は書き換えない
# ---------------------------------------------------------------
def test_dry_run_does_not_write(author, verse, chapter, book):
    cv = Comment.objects.create(user=author, verse=verse, body="節コメント")
    cc = Comment.objects.create(user=author, chapter=chapter, body="章コメント")
    cb = Comment.objects.create(user=author, book=book, body="書コメント")

    out = _run()  # 既定は dry-run

    assert "DRY RUN" in out
    assert "Dry run only. No comments were updated." in out
    for c in (cv, cc, cb):
        c.refresh_from_db()
        assert c.canonical_book_id is None
        assert c.chapter_number is None
        assert c.verse_number is None
        assert c.source_translation is None


# ---------------------------------------------------------------
# 2. apply で3粒度を正しく更新
# ---------------------------------------------------------------
def test_apply_backfills_three_granularities(author, verse, chapter, book):
    cv = Comment.objects.create(user=author, verse=verse, body="節コメント")
    cc = Comment.objects.create(user=author, chapter=chapter, body="章コメント")
    cb = Comment.objects.create(user=author, book=book, body="書コメント")

    _run("--apply")

    cv.refresh_from_db()
    assert cv.canonical_book_id == book.canonical_book_id
    assert cv.chapter_number == chapter.number
    assert cv.verse_number == verse.number
    assert cv.source_translation == book.translation

    cc.refresh_from_db()
    assert cc.canonical_book_id == book.canonical_book_id
    assert cc.chapter_number == chapter.number
    assert cc.verse_number is None
    assert cc.source_translation == book.translation

    cb.refresh_from_db()
    assert cb.canonical_book_id == book.canonical_book_id
    assert cb.chapter_number is None
    assert cb.verse_number is None
    assert cb.source_translation == book.translation


# ---------------------------------------------------------------
# 3. 冪等：2回目の apply は更新0でエラーにならない
# ---------------------------------------------------------------
def test_apply_is_idempotent(author, verse):
    Comment.objects.create(user=author, verse=verse, body="節コメント")

    out1 = _run("--apply")
    assert "実際の更新件数: 1" in out1

    c = Comment.objects.get(verse=verse)
    before = (c.canonical_book_id, c.chapter_number, c.verse_number, c.source_translation)

    out2 = _run("--apply")
    assert "実際の更新件数: 0" in out2
    assert "すでに正しい（already correct）: 1" in out2

    c.refresh_from_db()
    assert (c.canonical_book_id, c.chapter_number, c.verse_number, c.source_translation) == before


# ---------------------------------------------------------------
# 4. 旧ターゲットFK不正なら全件更新しない
# ---------------------------------------------------------------
def test_invalid_old_fk_all_null_aborts_all(author, verse):
    good = Comment.objects.create(user=author, verse=verse, body="正常")
    bad = Comment.objects.create(user=author, body="旧FK全NULL")  # verse/chapter/book すべて NULL

    with pytest.raises(CommandError):
        _run("--apply")

    good.refresh_from_db()
    bad.refresh_from_db()
    # 正常な行も含めて一切書き込まれていない
    assert good.canonical_book_id is None
    assert bad.canonical_book_id is None


def test_invalid_old_fk_multiple_aborts_all(author, verse, chapter):
    good = Comment.objects.create(user=author, verse=verse, body="正常")
    bad = Comment.objects.create(user=author, verse=verse, chapter=chapter, body="複数FK")  # verse+chapter

    with pytest.raises(CommandError):
        _run("--apply")

    good.refresh_from_db()
    assert good.canonical_book_id is None


# ---------------------------------------------------------------
# 5. 6A追加列が部分入力・不一致なら停止して上書きしない
# ---------------------------------------------------------------
def test_partial_new_fields_aborts_without_overwrite(author, verse, book):
    good = Comment.objects.create(user=author, verse=verse, body="正常")
    # canonical_book だけ入った部分入力（未バックフィルでも完全一致でもない）
    partial = Comment.objects.create(
        user=author, verse=verse, body="部分入力",
        canonical_book=book.canonical_book,
    )

    with pytest.raises(CommandError):
        _run("--apply")

    good.refresh_from_db()
    partial.refresh_from_db()
    assert good.canonical_book_id is None  # 正常行も未更新
    # 部分入力行は上書きされず、chapter_number/verse_number は NULL のまま
    assert partial.chapter_number is None
    assert partial.verse_number is None
    assert partial.source_translation is None


# ---------------------------------------------------------------
# 6. すでに正しい行はスキップ
# ---------------------------------------------------------------
def test_already_correct_is_skipped(author, verse, chapter, book):
    Comment.objects.create(
        user=author, verse=verse, body="バックフィル済み",
        canonical_book=book.canonical_book,
        chapter_number=chapter.number,
        verse_number=verse.number,
        source_translation=book.translation,
    )

    out = _run("--apply")

    assert "すでに正しい（already correct）: 1" in out
    assert "実際の更新件数: 0" in out


# ---------------------------------------------------------------
# 7. 親子不一致で停止
# ---------------------------------------------------------------
def test_parent_child_target_mismatch_aborts(author, verse, verse2):
    parent = Comment.objects.create(user=author, verse=verse, body="親")
    # 子は別の節（同じ章の2節目）を指す＝親子ターゲット不一致
    Comment.objects.create(user=author, verse=verse2, parent=parent, body="子")

    with pytest.raises(CommandError):
        _run("--apply")

    parent.refresh_from_db()
    assert parent.canonical_book_id is None  # 一切書き込まれていない
