"""import_greek（Nestle 1904 ギリシャ語）ローダのテスト。

OSIS XML を tmp_path に書き出してコマンドを実行し、
<milestone unit="verse"> 区切りと <w>/<pc> の連結、冪等性、
<title type="main"> 欠落時のエラーを確認する。
"""

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from bible.models import Book, Verse

pytestmark = pytest.mark.django_db

TRANSLATION = "Nestle 1904 (GRC)"

# 単語は空白区切り、句読点(<pc>)は直前の語に密着する想定。
SAMPLE_XML = """<?xml version="1.0" encoding="UTF-8"?>
<osisText>
  <title type="main">ΚΑΤΑ ΜΑΘΘΑΙΟΝ</title>
  <milestone unit="verse" id="Matt.1.1"/>
  <w>Ἐν</w><w>ἀρχῇ</w><pc>,</pc>
  <milestone unit="verse" id="Matt.1.2"/>
  <w>καὶ</w><w>Λόγος</w><pc>.</pc>
</osisText>
"""


def _write_xml(tmp_path, text: str, name: str = "01-matthew.xml") -> str:
    (tmp_path / name).write_text(text, encoding="utf-8")
    return str(tmp_path)


def test_import_creates_book_and_verses(tmp_path):
    path = _write_xml(tmp_path, SAMPLE_XML)
    call_command("import_greek", "--path", path)

    book = Book.objects.get(name="ΚΑΤΑ ΜΑΘΘΑΙΟΝ", translation=TRANSLATION)
    assert book.order == 1
    assert Verse.objects.filter(chapter__book=book).count() == 2

    v1 = Verse.objects.get(chapter__book=book, chapter__number=1, number=1)
    v2 = Verse.objects.get(chapter__book=book, chapter__number=1, number=2)
    # <w> は空白区切り、<pc> の読点は直前の語に密着する
    assert v1.text == "Ἐν ἀρχῇ,"
    assert v2.text == "καὶ Λόγος."


def test_import_is_idempotent(tmp_path):
    path = _write_xml(tmp_path, SAMPLE_XML)
    call_command("import_greek", "--path", path)
    call_command("import_greek", "--path", path)  # 2 回目

    assert Book.objects.filter(translation=TRANSLATION).count() == 1
    assert Verse.objects.filter(chapter__book__translation=TRANSLATION).count() == 2


def test_missing_title_raises(tmp_path):
    bad = '<?xml version="1.0"?><osisText>'  \
        '<milestone unit="verse" id="Matt.1.1"/><w>Ἐν</w></osisText>'
    path = _write_xml(tmp_path, bad)
    with pytest.raises(CommandError):
        call_command("import_greek", "--path", path)


def test_missing_dir_raises(tmp_path):
    with pytest.raises(CommandError):
        call_command("import_greek", "--path", str(tmp_path / "nope"))
