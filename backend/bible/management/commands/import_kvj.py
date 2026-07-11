"""
KJV 4福音書インポートコマンド。

使い方:
  python manage.py import_kvj
  python manage.py import_kvj --path /text/kvj

処理は冪等（get_or_create）なので何度実行しても安全。
"""

import re
from pathlib import Path

from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from bible.canonical import get_or_create_book_with_canonical
from bible.models import Book, Chapter, Verse

TRANSLATION = "KJV"

_VERSE_ANCHOR = re.compile(r"^(\d+)-(\d+):(\d+)$")


def _parse_book_name(soup: BeautifulSoup) -> str:
    h3 = soup.find("h3")
    if h3 is None:
        raise CommandError("<h3> タグが見つかりませんでした。")
    return h3.get_text(strip=True)


def _parse_verses(soup: BeautifulSoup) -> dict[tuple[int, int], str]:
    result: dict[tuple[int, int], str] = {}

    for anchor in soup.find_all("a", attrs={"name": True}):
        name = anchor.get("name", "")
        m = _VERSE_ANCHOR.match(name)
        if not m:
            continue

        ch_num = int(m.group(2))
        v_num = int(m.group(3))

        sibling = anchor.next_sibling
        while sibling is not None and getattr(sibling, "name", None) != "small":
            sibling = sibling.next_sibling

        if sibling is None or sibling.name != "small":
            continue

        text_node = sibling.next_sibling
        text = str(text_node).strip() if text_node else ""
        if text:
            result[(ch_num, v_num)] = text

    return result


class Command(BaseCommand):
    help = "KJV 4福音書を text/kvj/ ディレクトリの HTM ファイルからインポートする。"

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default="/text/kvj",
            help="HTM ファイルが置かれているディレクトリ（デフォルト: /text/kvj）",
        )

    def handle(self, *args, **options):
        text_dir = Path(options["path"])
        if not text_dir.is_dir():
            raise CommandError(f"ディレクトリが見つかりません: {text_dir}")

        htm_files = sorted(text_dir.glob("*.htm"))
        if not htm_files:
            raise CommandError(f"HTM ファイルが見つかりません: {text_dir}")

        for order, path in enumerate(htm_files, start=1):
            self._import_file(path, order)

        self.stdout.write(self.style.SUCCESS("KJV インポートが完了しました。"))

    @transaction.atomic
    def _import_file(self, path: Path, order: int) -> None:
        self.stdout.write(f"処理中: {path.name}")

        with open(path, encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")

        book_name = _parse_book_name(soup)
        verses = _parse_verses(soup)

        if not verses:
            self.stdout.write(self.style.WARNING(f"  節が取得できませんでした: {path.name}"))
            return

        book, created = get_or_create_book_with_canonical(
            name=book_name,
            translation=TRANSLATION,
            order=order,
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
