"""節本文の先頭に紛れ込んだ参照プレフィックスを取り除く修復コマンド。

公認本文（TR (GRC)）などで、本文が「書名 章:節 本文」の形になっており、
先頭に「Κατα Ματθαιον 1:1 」のような参照が残っている。これを除去する。

安全性:
  各節について「その書名 その章:その節 」で始まるときだけ、その分だけを削る。
  一致しない節（既にクリーンな節など）は一切変更しない。冪等なので何度実行してもよい。

使い方:
  python manage.py strip_verse_ref_prefix                       # TR (GRC) を修復
  python manage.py strip_verse_ref_prefix --translation "KJV"   # 訳を指定
  python manage.py strip_verse_ref_prefix --dry-run             # 変更せず件数だけ表示
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from bible.models import Book, Verse


def strip_prefix(text: str, book_name: str, chapter: int, verse: int) -> str:
    """text が「書名 章:節 」で始まるときだけ、その参照を取り除いて返す。"""
    ref = f"{book_name} {chapter}:{verse} "
    if text.startswith(ref):
        return text[len(ref):].lstrip()
    return text


class Command(BaseCommand):
    help = "節本文の先頭に残った参照プレフィックス（例: 「Κατα Ματθαιον 1:1 」）を除去する。"

    def add_arguments(self, parser):
        parser.add_argument(
            "--translation",
            default="TR (GRC)",
            help="対象の訳名（Book.translation）。デフォルト: TR (GRC)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="変更を保存せず、対象件数だけ表示する。",
        )

    def handle(self, *args, **options):
        translation = options["translation"]
        dry_run = options["dry_run"]

        books = Book.objects.filter(translation=translation)
        if not books.exists():
            self.stdout.write(self.style.WARNING(f"該当する訳がありません: {translation}"))
            return

        changed = 0
        to_update: list[Verse] = []
        for book in books:
            verses = Verse.objects.filter(chapter__book=book).select_related("chapter")
            for v in verses:
                new_text = strip_prefix(v.text, book.name, v.chapter.number, v.number)
                if new_text != v.text:
                    v.text = new_text
                    to_update.append(v)
                    changed += 1

        if dry_run:
            self.stdout.write(f"[dry-run] 除去対象: {changed} 節（{translation}）")
            return

        with transaction.atomic():
            Verse.objects.bulk_update(to_update, ["text"], batch_size=500)

        self.stdout.write(
            self.style.SUCCESS(f"{translation}: {changed} 節の参照プレフィックスを除去しました。")
        )
