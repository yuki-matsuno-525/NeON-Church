"""
口語訳4福音書インポートコマンド。

使い方:
  python manage.py import_gospel
  python manage.py import_gospel --path /text   # デフォルトは /text

処理は冪等（get_or_create）なので何度実行しても安全。
"""

import re
from pathlib import Path

from bs4 import BeautifulSoup
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from bible.models import Book, Chapter, Verse

DEFAULT_TRANSLATION = "口語訳"

# <a name="101-1:1"> 形式のアンカーを識別する正規表現
_VERSE_ANCHOR = re.compile(r"^(\d+)-(\d+):(\d+)$")


def _parse_book_name(soup: BeautifulSoup, translation: str) -> str:
    """
    <h3> から書名を抽出する。
    口語訳: "101 マタイによる福音書 - Matthew" → "マタイによる福音書"
    KJV:    "Matthew" → "Matthew"
    """
    h3 = soup.find("h3")
    if h3 is None:
        raise CommandError("<h3> タグが見つかりませんでした。")
    raw = h3.get_text(strip=True)
    if translation == "KJV":
        return raw.strip()
    # "101 マタイによる福音書 - Matthew" → "マタイによる福音書"
    japanese_part = raw.split(" - ")[0]
    tokens = japanese_part.split()
    return " ".join(t for t in tokens if not t.isdigit())


def _parse_verses(soup: BeautifulSoup) -> dict[tuple[int, int], str]:
    """
    章番号・節番号 → 本文テキスト の辞書を返す。
    アンカー <a name="{book}-{ch}:{v}"> の直後の <small> 要素の
    次のテキストノードを節本文として取得する。
    """
    result: dict[tuple[int, int], str] = {}

    for anchor in soup.find_all("a", attrs={"name": True}):
        name = anchor.get("name", "")
        m = _VERSE_ANCHOR.match(name)
        if not m:
            continue

        ch_num = int(m.group(2))
        v_num = int(m.group(3))

        # アンカーの次の兄弟要素を辿って <small> を探す
        sibling = anchor.next_sibling
        while sibling is not None and getattr(sibling, "name", None) != "small":
            sibling = sibling.next_sibling

        if sibling is None or sibling.name != "small":
            continue

        # <small> の次のノードが本文テキスト
        text_node = sibling.next_sibling
        text = str(text_node).strip() if text_node else ""
        if text:
            result[(ch_num, v_num)] = text

    return result


class Command(BaseCommand):
    help = "4福音書を text/ ディレクトリの HTM ファイルからインポートする。"

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default="/text",
            help="HTM ファイルが置かれているディレクトリ（デフォルト: /text）",
        )
        parser.add_argument(
            "--translation",
            default=DEFAULT_TRANSLATION,
            help=f"翻訳名（デフォルト: {DEFAULT_TRANSLATION}）例: KJV",
        )

    def handle(self, *args, **options):
        text_dir = Path(options["path"])
        if not text_dir.is_dir():
            raise CommandError(f"ディレクトリが見つかりません: {text_dir}")

        self.translation = options["translation"]

        # ファイルをソートして処理（101→102→103→104 の順で order を割り当てる）
        htm_files = sorted(text_dir.glob("*.htm"))
        if not htm_files:
            raise CommandError(f"HTM ファイルが見つかりません: {text_dir}")

        for order, path in enumerate(htm_files, start=1):
            self._import_file(path, order)

        self.stdout.write(self.style.SUCCESS("インポートが完了しました。"))

    @transaction.atomic
    def _import_file(self, path: Path, order: int) -> None:
        self.stdout.write(f"処理中: {path.name}")

        with open(path, encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")

        book_name = _parse_book_name(soup, self.translation)
        verses = _parse_verses(soup)

        if not verses:
            self.stdout.write(self.style.WARNING(f"  節が取得できませんでした: {path.name}"))
            return

        book, created = Book.objects.get_or_create(
            name=book_name,
            translation=self.translation,
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
