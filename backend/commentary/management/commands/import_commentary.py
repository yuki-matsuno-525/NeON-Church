"""解釈書をまとめて DB へ入れる（本番の Render シェルで流すコマンド）。

    python manage.py import_commentary                 # seed の全冊
    python manage.py import_commentary --only rashi-on-torah calvin-commentaries
    python manage.py import_commentary --dry-run       # 検証だけして保存しない

コメント・Q&A・お気に入りは「解釈書・章番号・区切り番号」で付く。それらが付いている場所の
番号や本文が変わる入れ直しは、付き先がずれるので止まる（--force で押し切れるが使わない前提）。

commentary/seed/ にコミットされた正規化データ（*.json.gz）を読む。ネットワークには
つながない。データを作り直すのはローカルの collect_commentary の役目。
何度流しても同じ結果になる（同じ slug の本は入れ直す）。
"""

from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from commentary.loader import CommentaryDataError, known_book_slugs, load_work, read_seed

# このファイル: commentary/management/commands/import_commentary.py → parents[2] = commentary
DEFAULT_DIR = Path(__file__).resolve().parents[2] / "seed"


class Command(BaseCommand):
    help = "commentary/seed/ の解釈書データを DB へ入れる（冪等）。"

    def add_arguments(self, parser):
        parser.add_argument("--dir", default=str(DEFAULT_DIR), help=f"seed のディレクトリ（既定: {DEFAULT_DIR}）")
        parser.add_argument("--only", nargs="+", metavar="SLUG", help="この slug の本だけ入れる")
        parser.add_argument("--dry-run", action="store_true", help="検証と件数表示だけして保存しない")
        parser.add_argument(
            "--force",
            action="store_true",
            help="コメント等が付いている場所の番号・本文が変わっても入れ直す（付き先がずれる。普段は使わない）",
        )

    def handle(self, *args, **options):
        directory = Path(options["dir"])
        paths = sorted(directory.glob("*.json.gz")) + sorted(directory.glob("*.json"))
        if not paths:
            raise CommandError(f"seed が見つかりません: {directory}")

        book_slugs = known_book_slugs()
        only = set(options["only"] or [])
        total_sections = total_links = count = 0

        with transaction.atomic():
            for path in paths:
                data = read_seed(path)
                if only and data.get("slug") not in only:
                    continue
                try:
                    work, n_sections, n_links = load_work(data, book_slugs, force=options["force"])
                except CommentaryDataError as e:
                    raise CommandError(f"{path.name}: {e}")
                count += 1
                total_sections += n_sections
                total_links += n_links
                self.stdout.write(f"  {work.slug}: 区切り {n_sections} / 箇所 {n_links}")

            if only and count != len(only):
                raise CommandError(f"--only に seed の無い slug があります（{count}/{len(only)} 冊だけ見つかりました）")
            if options["dry_run"]:
                transaction.set_rollback(True)

        prefix = "[dry-run] " if options["dry_run"] else ""
        self.stdout.write(
            self.style.SUCCESS(f"{prefix}完了: {count} 冊 / 区切り {total_sections} / 箇所 {total_links}")
        )
