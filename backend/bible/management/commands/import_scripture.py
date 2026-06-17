"""正規化 JSON から書をインポートする汎用コマンド。

使い方:
  python manage.py import_scripture path/to/enoch.json

JSON は bible/importers が出力する正規化スキーマ:
  {"book": "...", "translation": "...", "order": 700,
   "chapters": [{"number": 1, "verses": [{"number": 1, "text": "..."}]}]}

形式の違うソース（HTML 等）は書ごとのパーサで正規化 JSON にしてから、
このコマンドで投入する。処理は冪等（get_or_create / bulk_create ignore_conflicts）。
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from bible.importers.loader import load_book


class Command(BaseCommand):
    help = "正規化 JSON（book/translation/order/chapters/verses）から書を投入する。"

    def add_arguments(self, parser):
        parser.add_argument("json_path", type=str, help="正規化 JSON ファイルへのパス")

    def handle(self, *args, **options):
        path = Path(options["json_path"])
        if not path.exists():
            raise CommandError(f"ファイルが見つかりません: {path}")

        data = json.loads(path.read_text(encoding="utf-8"))
        try:
            book, created, total_verses = load_book(data)
        except ValueError as e:
            raise CommandError(str(e))

        self.stdout.write(
            f"{'作成' if created else '既存'}: {book.name}（{book.translation}）"
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"完了: {len(data['chapters'])} 章 / {total_verses} 節を投入しました。"
            )
        )
