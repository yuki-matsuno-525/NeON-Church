"""正本 canonical_books.json を読み、既存 Book を CanonicalBook へ紐づける。

使い方:
  python manage.py sync_canonical_books            # 実投入
  python manage.py sync_canonical_books --dry-run  # 変更を保存せず結果だけ表示

段階3A のコマンド。処理は冪等（get_or_create ＋ 既リンクはスキップ）。
正本 JSON と DB の (translation, name) が**過不足なく一致**することを要求し、
一致しない・曖昧な対応があれば非ゼロ終了する。`Book.canonical_book` の NOT NULL 化は
本コマンドで各環境のバックフィルが済んだ後、別段階で行う（ここではしない）。
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from bible.models import Book, CanonicalBook

# backend/bible/data/canonical_books.json（このファイルから見た相対位置）
DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "canonical_books.json"


class Command(BaseCommand):
    help = "canonical_books.json を正本に、既存 Book を CanonicalBook へ紐づける（冪等）。"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="変更を保存せず、作成/リンク/スキップ件数だけ表示する。",
        )
        parser.add_argument(
            "--path",
            default=str(DATA_PATH),
            help="正本 JSON のパス（既定: bible/data/canonical_books.json）。",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"正本が見つかりません: {path}")

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            raise CommandError(f"JSON を読めません: {e}")

        # 1) JSON 自体の妥当性検証 → (translation, name) -> slug の索引を得る
        pair_to_slug = self._validate_and_index(data)

        # 2) DB との完全一致を要求（片側だけに存在する Book はエラー）
        db_pairs = {(b.translation, b.name): b for b in Book.objects.all()}
        json_pairs = set(pair_to_slug)

        missing_in_json = sorted(db_pairs.keys() - json_pairs)
        missing_in_db = sorted(json_pairs - db_pairs.keys())
        if missing_in_json:
            joined = ", ".join(f"{t}/{n}" for t, n in missing_in_json)
            raise CommandError(f"JSON に定義の無い DB Book があります: {joined}")
        if missing_in_db:
            joined = ", ".join(f"{t}/{n}" for t, n in missing_in_db)
            raise CommandError(f"DB に存在しない Book が JSON に定義されています: {joined}")

        # 3) 投入（トランザクションで囲む。dry-run は最後にロールバック）
        created = linked = skipped = 0
        with transaction.atomic():
            slug_to_canon: dict[str, CanonicalBook] = {}
            for slug in sorted(set(pair_to_slug.values())):
                canon, was_created = CanonicalBook.objects.get_or_create(slug=slug)
                slug_to_canon[slug] = canon
                if was_created:
                    created += 1

            for (translation, name), slug in pair_to_slug.items():
                book = db_pairs[(translation, name)]
                canon = slug_to_canon[slug]
                if book.canonical_book_id == canon.id:
                    skipped += 1
                else:
                    book.canonical_book = canon
                    book.save(update_fields=["canonical_book"])
                    linked += 1

            # 実投入後、未リンクが残らないことを確認（完全一致要求のため 0 のはず）
            unlinked = Book.objects.filter(canonical_book__isnull=True).count()
            if unlinked:
                raise CommandError(f"未リンクの Book が {unlinked} 件残っています（想定外）。")

            if dry_run:
                transaction.set_rollback(True)

        mode = "[dry-run] " if dry_run else ""
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode}CanonicalBook 作成: {created} / リンク: {linked} / "
                f"既リンク(スキップ): {skipped} / Book 総数: {len(db_pairs)}"
            )
        )

    def _validate_and_index(self, data) -> dict[tuple[str, str], str]:
        """正本を検証し、(translation, name) -> slug の索引を返す。

        検証: 配列が空でない / slug が空でなく重複しない / books が空でない /
        translation・name が空でない / (translation, name) が全体で一意。
        """
        if not isinstance(data, list) or not data:
            raise CommandError("正本は空でない配列である必要があります。")

        seen_slugs: set[str] = set()
        pair_to_slug: dict[tuple[str, str], str] = {}

        for entry in data:
            slug = entry.get("slug") if isinstance(entry, dict) else None
            if not slug or not isinstance(slug, str):
                raise CommandError(f"slug が空/不正のエントリがあります: {entry}")
            if slug in seen_slugs:
                raise CommandError(f"slug が重複しています: {slug}")
            seen_slugs.add(slug)

            books = entry.get("books")
            if not isinstance(books, list) or not books:
                raise CommandError(f"books 配列が空です: slug={slug}")

            for bk in books:
                translation = bk.get("translation") if isinstance(bk, dict) else None
                name = bk.get("name") if isinstance(bk, dict) else None
                if not translation or not name:
                    raise CommandError(f"translation/name が空です: slug={slug}, {bk}")
                key = (translation, name)
                if key in pair_to_slug:
                    raise CommandError(
                        f"(translation, name) が重複しています: {translation}/{name} が "
                        f"slug={pair_to_slug[key]} と slug={slug} の両方に存在します。"
                    )
                pair_to_slug[key] = slug

        return pair_to_slug
