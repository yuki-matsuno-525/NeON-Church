"""
import_gospel 管理コマンドのテスト。

合成 HTM ファイルを tmp_path に作成し、コマンドを実行して
Book / Chapter / Verse が正しく生成されることを確認する。
"""

import textwrap

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

# --- HTM テンプレートヘルパー ---

def _make_htm(book_number: int, book_name_ja: str, book_name_en: str, verses: dict) -> str:
    """
    verses: {(chapter, verse): text}
    例: {(1, 1): "節本文"}
    """
    anchor_blocks = []
    for (ch, v), text in sorted(verses.items()):
        anchor_blocks.append(
            f'<a name="{book_number}-{ch}:{v}"></a><small>{v}</small>{text}'
        )
    body = "\n".join(anchor_blocks)
    return textwrap.dedent(f"""\
        <html><body>
        <h3>{book_number} {book_name_ja} - {book_name_en}</h3>
        {body}
        </body></html>
    """)


# --- テスト ---

@pytest.mark.django_db
class TestImportGospel:
    def test_basic_import(self, tmp_path):
        """HTM ファイルから Book / Chapter / Verse が正しく作成される。"""
        from bible.models import Book, Chapter, Verse
        htm = _make_htm(101, "マタイによる福音書", "Matthew", {
            (1, 1): "節1-1",
            (1, 2): "節1-2",
            (2, 1): "節2-1",
        })
        (tmp_path / "101Matthew.htm").write_text(htm, encoding="utf-8")

        call_command("import_gospel", "--path", str(tmp_path))

        assert Book.objects.filter(name="マタイによる福音書", translation="口語訳").exists()
        book = Book.objects.get(name="マタイによる福音書")
        assert Chapter.objects.filter(book=book, number=1).exists()
        assert Chapter.objects.filter(book=book, number=2).exists()
        assert Verse.objects.filter(chapter__book=book, number=1, text="節1-1").exists()
        assert Verse.objects.filter(chapter__book=book, number=2, text="節1-2").exists()
        ch2 = Chapter.objects.get(book=book, number=2)
        assert Verse.objects.filter(chapter=ch2, number=1, text="節2-1").exists()

    def test_idempotent(self, tmp_path):
        """2回実行してもレコードが重複しない。"""
        from bible.models import Book, Chapter, Verse
        htm = _make_htm(101, "マタイによる福音書", "Matthew", {(1, 1): "節テキスト"})
        (tmp_path / "101Matthew.htm").write_text(htm, encoding="utf-8")

        call_command("import_gospel", "--path", str(tmp_path))
        call_command("import_gospel", "--path", str(tmp_path))

        assert Book.objects.filter(name="マタイによる福音書").count() == 1
        assert Chapter.objects.filter(number=1).count() == 1
        assert Verse.objects.filter(number=1).count() == 1

    def test_ordering(self, tmp_path):
        """ファイル名のソート順が Book.order に反映される。"""
        from bible.models import Book
        for num, ja, en in [
            (101, "マタイによる福音書", "Matthew"),
            (102, "マルコによる福音書", "Mark"),
            (103, "ルカによる福音書", "Luke"),
        ]:
            htm = _make_htm(num, ja, en, {(1, 1): "節テキスト"})
            (tmp_path / f"{num}{en}.htm").write_text(htm, encoding="utf-8")

        call_command("import_gospel", "--path", str(tmp_path))

        books = list(Book.objects.order_by("order").values_list("name", flat=True))
        assert books == ["マタイによる福音書", "マルコによる福音書", "ルカによる福音書"]

    def test_invalid_directory_raises(self, tmp_path):
        """存在しないディレクトリを指定すると CommandError が上がる。"""
        with pytest.raises(CommandError, match="ディレクトリが見つかりません"):
            call_command("import_gospel", "--path", str(tmp_path / "nonexistent"))

    def test_no_htm_files_raises(self, tmp_path):
        """HTM ファイルが 0 件のディレクトリを指定すると CommandError が上がる。"""
        with pytest.raises(CommandError, match="HTM ファイルが見つかりません"):
            call_command("import_gospel", "--path", str(tmp_path))

    def test_verse_count(self, tmp_path):
        """複数章・複数節の合計節数が正しい。"""
        from bible.models import Book, Verse
        verses = {(ch, v): f"ch{ch}-v{v}" for ch in range(1, 4) for v in range(1, 4)}
        htm = _make_htm(101, "マタイによる福音書", "Matthew", verses)
        (tmp_path / "101Matthew.htm").write_text(htm, encoding="utf-8")

        call_command("import_gospel", "--path", str(tmp_path))

        book = Book.objects.get(name="マタイによる福音書")
        assert Verse.objects.filter(chapter__book=book).count() == 9
