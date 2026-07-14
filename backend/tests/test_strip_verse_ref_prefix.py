"""strip_verse_ref_prefix コマンドの回帰テスト。

公認本文（TR (GRC)）などで本文先頭に残る参照（例: 「Κατα Ματθαιον 1:1 」）を
除去できること、既にクリーンな節や無関係な訳は変更しないことを保証する。
"""
import pytest
from django.core.management import call_command

from bible.models import Chapter, Verse
from bible.management.commands.strip_verse_ref_prefix import strip_prefix
from tests.factories import make_book


def test_strip_prefix_removes_leading_reference():
    assert strip_prefix("Κατα Ματθαιον 1:1 βιβλος", "Κατα Ματθαιον", 1, 1) == "βιβλος"


def test_strip_prefix_keeps_clean_text():
    # プレフィックスが無い節はそのまま
    assert strip_prefix("ιακωβος θεου", "Ιακωβου", 1, 1) == "ιακωβος θεου"
    # 別の書名で始まっていても（章:節が一致しても）誤って削らない
    assert strip_prefix("Κατα Μαρκον 1:1 x", "Κατα Ματθαιον", 1, 1) == "Κατα Μαρκον 1:1 x"


@pytest.mark.django_db
def test_command_strips_only_target_translation():
    book = make_book("Κατα Ματθαιον", "TR (GRC)", 1, slug="matthew")
    ch = Chapter.objects.create(book=book, number=1)
    dirty = Verse.objects.create(chapter=ch, number=1, text="Κατα Ματθαιον 1:1 βιβλος")
    clean = Verse.objects.create(chapter=ch, number=2, text="αβρααμ εγεννησεν")
    # 対象外の訳は触らない
    other = make_book("マタイによる福音書", "口語訳", 1, slug="matthew")
    other_ch = Chapter.objects.create(book=other, number=1)
    other_v = Verse.objects.create(chapter=other_ch, number=1, text="口語訳 1:1 の本文")

    call_command("strip_verse_ref_prefix", "--translation", "TR (GRC)")

    dirty.refresh_from_db()
    clean.refresh_from_db()
    other_v.refresh_from_db()
    assert dirty.text == "βιβλος"
    assert clean.text == "αβρααμ εγεννησεν"
    assert other_v.text == "口語訳 1:1 の本文"  # 対象外なので不変


@pytest.mark.django_db
def test_command_is_idempotent():
    book = make_book("Προς Ρωμαιους", "TR (GRC)", 6, slug="romans")
    ch = Chapter.objects.create(book=book, number=1)
    v = Verse.objects.create(chapter=ch, number=1, text="Προς Ρωμαιους 1:1 παυλος")

    call_command("strip_verse_ref_prefix")
    v.refresh_from_db()
    assert v.text == "παυλος"
    # 2回目は何も変わらない
    call_command("strip_verse_ref_prefix")
    v.refresh_from_db()
    assert v.text == "παυλος"
