"""外典・偽典（others）をまとめて DB へ投入する一発コマンド。

    python manage.py import_others

bible/seed/others/ にコミットされた確認済み正規化 JSON を全て読み込んで投入する。
HTML のパースはローカルで済ませ（bible/importers/cli.py）、本番（Render 等）には
確定 JSON を配ってこのコマンド 1 つで投入する想定。処理は冪等。
"""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from bible.importers.loader import load_book

# このファイル: bible/management/commands/import_others.py → parents[2] = bible
DEFAULT_DIR = Path(__file__).resolve().parents[2] / "seed" / "others"


class Command(BaseCommand):
    help = "bible/seed/others/ の正規化 JSON を全て投入する（外典・偽典の一括投入）。"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dir",
            type=str,
            default=str(DEFAULT_DIR),
            help=f"JSON ディレクトリ（既定: {DEFAULT_DIR}）",
        )

    def handle(self, *args, **options):
        directory = Path(options["dir"])
        if not directory.is_dir():
            raise CommandError(f"ディレクトリが見つかりません: {directory}")

        json_paths = sorted(directory.glob("*.json"))
        if not json_paths:
            raise CommandError(f"JSON が見つかりません: {directory}")

        grand_total = 0
        for path in json_paths:
            data = json.loads(path.read_text(encoding="utf-8"))
            try:
                book, created, total_verses = load_book(data)
            except ValueError as e:
                raise CommandError(f"{path.name}: {e}")
            grand_total += total_verses
            self.stdout.write(
                f"  {'作成' if created else '既存'}: {book.name}（{book.translation}）"
                f" — {len(data['chapters'])} 章 / {total_verses} 節"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"完了: {len(json_paths)} 冊 / 合計 {grand_total} 節を投入しました。"
            )
        )
