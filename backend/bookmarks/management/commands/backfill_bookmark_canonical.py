"""段階5B: 既存の verse 栞に、訳非依存の箇所をバックフィルする。

使い方:
  python manage.py backfill_bookmark_canonical            # 実投入
  python manage.py backfill_bookmark_canonical --dry-run  # 変更を保存せず件数だけ表示

各 verse 栞の `verse → chapter → book.canonical_book / chapter.number / verse.number` を
導出して canonical_book / chapter_number / verse_number を埋める。処理は冪等（既に正しく
埋まっていれば skip）。全体を1トランザクションで囲み、次の場合は途中保存せずロールバックして
非ゼロ終了する:
  - 同一 (user, 箇所) の verse 栞が複数ある（＝箇所ベースの重複。統合は本コマンドではしない）
  - バックフィル後も箇所 NULL の verse 栞が残る（book に canonical が無い等の想定外）
comment 栞（verse が無い）は対象外で、箇所列は NULL のまま。
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from bookmarks.models import Bookmark


class Command(BaseCommand):
    help = "verse 栞の canonical_book/chapter_number/verse_number を verse から導出して埋める（冪等）。"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="変更を保存せず、更新/スキップ件数だけ表示する。",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        updated = skipped = 0

        with transaction.atomic():
            qs = (
                Bookmark.objects.filter(verse__isnull=False)
                .select_related("verse__chapter__book")
            )
            seen: set[tuple] = set()  # (user_id, canonical_id, 章, 節) の重複検出用

            for bm in qs:
                verse = bm.verse
                chapter = verse.chapter
                canonical_id = chapter.book.canonical_book_id

                key = (bm.user_id, canonical_id, chapter.number, verse.number)
                if key in seen:
                    raise CommandError(
                        f"同一 (user, 箇所) の verse 栞が重複しています: {key}。"
                        f"統合ルールを決めてから対応してください（本コマンドは統合しません）。"
                    )
                seen.add(key)

                already = (
                    bm.canonical_book_id == canonical_id
                    and bm.chapter_number == chapter.number
                    and bm.verse_number == verse.number
                )
                if already:
                    skipped += 1
                    continue

                bm.canonical_book_id = canonical_id
                bm.chapter_number = chapter.number
                bm.verse_number = verse.number
                bm.save(update_fields=["canonical_book", "chapter_number", "verse_number"])
                updated += 1

            # verse 栞で箇所 NULL が残っていないことを確認（book に canonical が無い等の想定外を検出）
            remaining = Bookmark.objects.filter(
                verse__isnull=False, canonical_book__isnull=True
            ).count()
            if remaining:
                raise CommandError(
                    f"バックフィル後も箇所 NULL の verse 栞が {remaining} 件残っています（想定外）。"
                )

            if dry_run:
                transaction.set_rollback(True)

        mode = "[dry-run] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(f"{mode}更新: {updated} / スキップ(既に埋済): {skipped}")
        )
