"""
Nestle 1904 ギリシャ語 4福音書インポートコマンド。

底本: Nestle 1904 Greek New Testament（パブリックドメイン）
データ: biblicalhumanities/Nestle1904 の OSIS XML（text/greek/*.xml）

使い方:
  python manage.py import_greek
  python manage.py import_greek --path /text/greek

処理は冪等（get_or_create）なので何度実行しても安全。
"""

import xml.etree.ElementTree as ET
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from bible.models import Book, Chapter, Verse

TRANSLATION = "Nestle 1904 (GRC)"


def _local(tag: str) -> str:
    """名前空間付きタグからローカル名を取り出す。"""
    return tag.rsplit("}", 1)[-1]


def _parse(path: Path) -> tuple[str, dict[tuple[int, int], str]]:
    """
    OSIS XML を (書名, {(章, 節): 本文}) に変換する。

    節境界は <milestone unit="verse" id="Book.Ch.V"/> で区切られ、
    直後に続く <w>（単語）と <pc>（句読点）を節本文として連結する。
    単語間はスペース区切り、句読点は直前の語に密着させる。
    """
    root = ET.parse(path).getroot()
    title = ""
    verses: dict[tuple[int, int], str] = {}
    cur: tuple[int, int] | None = None
    tokens: list[tuple[str, str]] = []

    def flush() -> None:
        if cur is None or not tokens:
            return
        text = ""
        for kind, txt in tokens:
            if not txt:
                continue
            text += (" " + txt if text else txt) if kind == "w" else txt
        if text:
            verses[cur] = text

    for el in root.iter():
        tag = _local(el.tag)
        if tag == "title" and el.get("type") == "main":
            title = (el.text or "").strip()
        elif tag == "milestone" and el.get("unit") == "verse":
            flush()
            parts = (el.get("id") or "").split(".")
            cur = (int(parts[-2]), int(parts[-1]))
            tokens = []
        elif tag == "w":
            tokens.append(("w", (el.text or "").strip()))
        elif tag == "pc":
            tokens.append(("pc", (el.text or "").strip()))
    flush()

    if not title:
        raise CommandError(f"<title type='main'> が見つかりません: {path.name}")
    return title, verses


class Command(BaseCommand):
    help = "Nestle 1904 ギリシャ語4福音書を text/greek/ の OSIS XML からインポートする。"

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default="/text/greek",
            help="XML ファイルが置かれているディレクトリ（デフォルト: /text/greek）",
        )

    def handle(self, *args, **options):
        text_dir = Path(options["path"])
        if not text_dir.is_dir():
            raise CommandError(f"ディレクトリが見つかりません: {text_dir}")

        # 01-matthew → 04-john の順で order を割り当てる
        xml_files = sorted(text_dir.glob("*.xml"))
        if not xml_files:
            raise CommandError(f"XML ファイルが見つかりません: {text_dir}")

        for order, path in enumerate(xml_files, start=1):
            self._import_file(path, order)

        self.stdout.write(self.style.SUCCESS("Nestle 1904 インポートが完了しました。"))

    @transaction.atomic
    def _import_file(self, path: Path, order: int) -> None:
        self.stdout.write(f"処理中: {path.name}")

        book_name, verses = _parse(path)

        if not verses:
            self.stdout.write(self.style.WARNING(f"  節が取得できませんでした: {path.name}"))
            return

        book, created = Book.objects.get_or_create(
            name=book_name,
            translation=TRANSLATION,
            defaults={"order": order},
        )
        if created:
            self.stdout.write(f"  書を作成: {book_name}")
        else:
            self.stdout.write(f"  書が既に存在します（スキップ）: {book_name}")

        verse_count = 0
        for (ch_num, v_num), text in verses.items():
            chapter, _ = Chapter.objects.get_or_create(book=book, number=ch_num)
            _, v_created = Verse.objects.get_or_create(
                chapter=chapter,
                number=v_num,
                defaults={"text": text},
            )
            if v_created:
                verse_count += 1

        self.stdout.write(f"  節を追加: {verse_count} 件")
