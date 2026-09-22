"""import_ibibles（ibibles.net テキストの汎用インポータ）のテスト。"""

import pytest
from django.core.management import call_command

from bible.management.commands.import_ibibles import parse_ibibles_text

SAMPLE = """=000 Bible begins
=101 Matthew
Mt 1:1 Mt 1:1 The book of the generation of Jesus Christ.
Mt 1:2 Mt 1:2 Abraham begat Isaac.
Mt 2:1 Mt 2:1 Now when Jesus was born in Bethlehem.
"""


def test_parse_extracts_books_verses_and_strips_dup_ref():
    books = parse_ibibles_text(SAMPLE)
    # 索引 000（本文なし）は落ちる。Matthew だけが残る。
    assert len(books) == 1
    index, name, verses = books[0]
    assert index == "101"
    assert name == "Matthew"
    assert verses[(1, 1)] == "The book of the generation of Jesus Christ."
    assert verses[(1, 2)] == "Abraham begat Isaac."
    assert verses[(2, 1)] == "Now when Jesus was born in Bethlehem."


def test_parse_strips_multiword_greek_reference():
    # gtr.txt 形式: 略号参照のあとに多語のフル書名参照が続く（"Mat 1:1 Κατα Ματθαιον 1:1 本文"）。
    # 多語の書名（Κατα Ματθαιον）でも重複参照を取り除けること。
    sample = "=101 Matthew\nMat 1:1 Κατα Ματθαιον 1:1 βιβλος γενεσεως\n"
    books = parse_ibibles_text(sample)
    _, _, verses = books[0]
    assert verses[(1, 1)] == "βιβλος γενεσεως"


def _write(tmp_path, text):
    p = tmp_path / "sample.txt"
    p.write_text(text, encoding="utf-8")
    return str(p)


@pytest.mark.django_db
def test_import_creates_book_chapters_verses(tmp_path):
    # canonical_books.json に (KJV, Matthew) -> matthew が登録済みなので解決できる。
    call_command("import_ibibles", "--txt", _write(tmp_path, SAMPLE), "--translation", "KJV")

    from bible.models import Book, Chapter, Verse
    book = Book.objects.get(translation="KJV", name="Matthew")
    assert book.canonical_book.slug == "matthew"
    assert Chapter.objects.filter(book=book).count() == 2
    assert Verse.objects.filter(chapter__book=book).count() == 3
    assert Verse.objects.get(chapter__book=book, chapter__number=1, number=1).text.startswith("The book")


@pytest.mark.django_db
def test_import_is_idempotent(tmp_path):
    path = _write(tmp_path, SAMPLE)
    call_command("import_ibibles", "--txt", path, "--translation", "KJV")
    from bible.models import Verse
    before = Verse.objects.count()
    call_command("import_ibibles", "--txt", path, "--translation", "KJV")
    assert Verse.objects.count() == before


@pytest.mark.django_db
def test_import_unregistered_translation_skips(tmp_path):
    # canonical_books.json にこの訳の登録が無ければ、その書はスキップ（エラーにしない）。
    call_command("import_ibibles", "--txt", _write(tmp_path, SAMPLE), "--translation", "NONEXISTENT (GRC)")
    from bible.models import Book
    assert not Book.objects.filter(translation="NONEXISTENT (GRC)").exists()


# ---------------------------------------------------------------------------
# 公認本文の異読の記号（{VAR1: … } {VAR2: … }）を画面に出さない
# ---------------------------------------------------------------------------

from bible.management.commands.import_ibibles import pick_scrivener_reading  # noqa: E402


@pytest.mark.parametrize(
    "raw, expected",
    [
        # 両方の読みがある → Scrivener 1894（VAR2）を残す
        ("δικαιος κυριε ει ο ων και ο ην και ο {VAR1: οσιος } {VAR2: εσομενος } οτι ταυτα",
         "δικαιος κυριε ει ο ων και ο ην και ο εσομενος οτι ταυτα"),
        # Stephanus にしか無い語 → 消す
        ("οι εις τας ακανθας σπειρομενοι {VAR1: ουτοι εισιν } οι τον λογον ακουοντες",
         "οι εις τας ακανθας σπειρομενοι οι τον λογον ακουοντες"),
        # Scrivener にしか無い語 → 残す
        ("ιδου αρχων {VAR2: εις } ελθων προσεκυνει", "ιδου αρχων εις ελθων προσεκυνει"),
        # 記号が無ければそのまま
        ("βιβλος γενεσεως ιησου χριστου", "βιβλος γενεσεως ιησου χριστου"),
    ],
)
def test_pick_scrivener_reading(raw, expected):
    assert pick_scrivener_reading(raw) == expected


def test_parse_removes_variant_markers():
    text = "=166 Revelation\nRev 16:5 Αποκαλυψις Ιωαννου 16:5 και ο {VAR1: οσιος } {VAR2: εσομενος } οτι\n"
    (_, _, verses), = parse_ibibles_text(text)
    assert verses[(16, 5)] == "και ο εσομενος οτι"


@pytest.mark.django_db
def test_migration_fixes_existing_verses():
    """取り込み済みの本文もデータ移行で直る（取り込みは既存の節を上書きしないため）。"""
    import importlib

    from django.apps import apps

    from bible.models import Chapter, Verse
    from tests.factories import make_book

    book = make_book("Αποκαλυψις Ιωαννου", "TR (GRC)", 66, slug="revelation")
    chapter = Chapter.objects.create(book=book, number=16)
    verse = Verse.objects.create(chapter=chapter, number=5, text="και ο {VAR1: οσιος } {VAR2: εσομενος } οτι")
    untouched = Verse.objects.create(chapter=chapter, number=6, text="οτι αιμα αγιων")

    migration = importlib.import_module("bible.migrations.0006_tr_pick_scrivener_reading")
    migration.pick_scrivener_reading(apps, None)

    verse.refresh_from_db()
    untouched.refresh_from_db()
    assert verse.text == "και ο εσομενος οτι"
    assert untouched.text == "οτι αιμα αγιων"
