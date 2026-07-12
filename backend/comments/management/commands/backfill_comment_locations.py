"""段階6B: 既存 Comment に訳非依存の箇所（canonical_book / chapter_number / verse_number）と
投稿時訳（source_translation）をバックフィルする。

使い方:
  python manage.py backfill_comment_locations            # dry-run（既定）。検証と件数表示のみ。DB は変更しない。
  python manage.py backfill_comment_locations --apply     # 実更新。

各 Comment 自身の旧 FK（verse / chapter / book のいずれか1つ）から箇所と訳を導出する。
親コメントからの継承は行わない（親子一致は検証で担保する）。

安全設計:
  - 全件を先に検証し、1件でも異常があれば CommandError で全体を失敗させ、DB へは一切書き込まない
    （「異常行をスキップして正常行だけ更新」はしない）。
  - 更新対象は「4フィールドすべて NULL（未バックフィル）」の行だけ。既に期待値と一致していれば
    already correct として更新しない（＝冪等。6C デプロイ後の catch-up 再実行も安全）。
  - 更新は transaction.atomic() 内で bulk_update（旧 verse/chapter/book・parent・translation_project 等は変更しない）。

検証で異常とするもの:
  - 旧ターゲット FK 不正（verse/chapter/book が全 NULL、または2つ以上設定）
  - 導出不可（参照先 Book の canonical_book が無い / Book.translation が NULL・空文字・空白のみ・長すぎる）
  - 返信の親子で箇所（粒度・canonical_book・章・節）が不一致、または親の旧 FK が不正で比較不能
  - 返信の親子で translation_project が不一致（両方 NULL は一致）
  - 6A 追加列が「未バックフィル」でも「期待値と完全一致」でもない（部分入力・不一致）
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from comments.models import Comment

# source_translation は Book.translation（max_length=50）のスナップショット。
SOURCE_TRANSLATION_MAX_LENGTH = Comment._meta.get_field("source_translation").max_length

_EXAMPLE_LIMIT = 5


def _single_target_grain(c: Comment):
    """旧 FK から粒度を返す。単一ターゲットでなければ None（全 NULL または複数設定）。"""
    grains = [g for fk, g in ((c.verse_id, "verse"), (c.chapter_id, "chapter"), (c.book_id, "book")) if fk is not None]
    return grains[0] if len(grains) == 1 else None


def _derive(c: Comment):
    """Comment 自身の旧 FK から (grain, canonical_book_id, chapter_number, verse_number, translation) を導出。

    単一ターゲットでなければ None を返す（呼び出し側で旧 FK 不正として扱う）。
    """
    grain = _single_target_grain(c)
    if grain is None:
        return None
    if grain == "verse":
        v = c.verse
        b = v.chapter.book
        return ("verse", b.canonical_book_id, v.chapter.number, v.number, b.translation)
    if grain == "chapter":
        ch = c.chapter
        b = ch.book
        return ("chapter", b.canonical_book_id, ch.number, None, b.translation)
    b = c.book
    return ("book", b.canonical_book_id, None, None, b.translation)


def _translation_ok(t) -> bool:
    return bool(t) and t.strip() != "" and len(t) <= SOURCE_TRANSLATION_MAX_LENGTH


class Command(BaseCommand):
    help = (
        "既存 Comment に箇所（canonical_book/chapter_number/verse_number）と投稿時訳（source_translation）を"
        "旧 FK から導出してバックフィルする（既定 dry-run・冪等・全件検証後に atomic 更新）。"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="実際に更新する。指定しなければ dry-run（DB は変更しない）。",
        )

    def handle(self, *args, **options):
        apply: bool = options["apply"]
        mode = "APPLY" if apply else "DRY RUN"

        comments = list(
            Comment.objects.select_related(
                "verse__chapter__book",
                "chapter__book",
                "book",
                "parent__verse__chapter__book",
                "parent__chapter__book",
                "parent__book",
            )
        )

        grain_counts = {"verse": 0, "chapter": 0, "book": 0, "invalid": 0}
        anomalies: dict[str, list[str]] = {
            "旧FK不正": [],
            "導出不可": [],
            "6A列 部分入力または不一致": [],
            "親子ターゲット不一致": [],
            "親子translation_project不一致": [],
        }
        anomalous_ids: set = set()
        candidates: list[Comment] = []
        already_correct = 0

        def flag(cat: str, cid) -> None:
            anomalies[cat].append(str(cid))
            anomalous_ids.add(cid)

        for c in comments:
            derived = _derive(c)
            if derived is None:
                grain_counts["invalid"] += 1
                flag("旧FK不正", c.id)
                continue
            grain, canonical_id, ch_no, vs_no, translation = derived
            grain_counts[grain] += 1

            # 導出可否
            if canonical_id is None or not _translation_ok(translation):
                flag("導出不可", c.id)
                # 導出できないので以降（6A列比較・更新候補判定）はスキップ
                continue

            # 返信は親子の箇所・translation_project 一致を検証
            if c.parent_id is not None:
                p_derived = _derive(c.parent)
                if p_derived is None:
                    flag("親子ターゲット不一致", c.id)  # 親の旧 FK 不正で比較不能
                elif p_derived[:4] != (grain, canonical_id, ch_no, vs_no):
                    flag("親子ターゲット不一致", c.id)
                if c.parent.translation_project_id != c.translation_project_id:
                    flag("親子translation_project不一致", c.id)

            # 6A 追加列の現在状態を分類
            expected = (canonical_id, ch_no, vs_no, translation)
            current = (c.canonical_book_id, c.chapter_number, c.verse_number, c.source_translation)
            all_null = current == (None, None, None, None)
            if current == expected:
                already_correct += 1
            elif all_null:
                if c.id not in anomalous_ids:
                    c.canonical_book_id = canonical_id
                    c.chapter_number = ch_no
                    c.verse_number = vs_no
                    c.source_translation = translation
                    candidates.append(c)
            else:
                flag("6A列 部分入力または不一致", c.id)

        target_mismatch = len(anomalies["親子ターゲット不一致"])
        tp_mismatch = len(anomalies["親子translation_project不一致"])
        anomaly_total = len(anomalous_ids)

        # ---- レポート出力（dry-run / apply 共通） ----
        w = self.stdout.write
        w("")
        w(f"実行モード: {mode}")
        w(f"Comment 総数: {len(comments)}")
        w(f"粒度別: verse={grain_counts['verse']} chapter={grain_counts['chapter']} book={grain_counts['book']}")
        w(f"更新候補（未バックフィル）: {len(candidates)}")
        w(f"すでに正しい（already correct）: {already_correct}")
        w(f"異常（重複なし）: {anomaly_total}")
        w(f"  親子ターゲット不一致: {target_mismatch}")
        w(f"  親子translation_project不一致: {tp_mismatch}")

        if anomaly_total:
            w("")
            w("異常カテゴリ別（Comment ID 代表例・最大5件）:")
            for cat, ids in anomalies.items():
                if ids:
                    sample = ", ".join(ids[:_EXAMPLE_LIMIT])
                    w(f"  {cat}: {len(ids)} 件  例: {sample}")
            raise CommandError(
                f"異常な Comment が {anomaly_total} 件あります。DB は変更していません。"
                "内容を確認・修正してから再実行してください（正常行のみ更新は行いません）。"
            )

        # ---- 更新（apply のみ） ----
        updated = 0
        if apply:
            with transaction.atomic():
                if candidates:
                    Comment.objects.bulk_update(
                        candidates,
                        ["canonical_book", "chapter_number", "verse_number", "source_translation"],
                    )
                updated = len(candidates)
            w("")
            w(self.style.SUCCESS(f"実際の更新件数: {updated}"))
            w(self.style.SUCCESS("Backfill applied successfully."))
        else:
            w("")
            w(f"実際の更新件数: {updated}")
            w("Dry run only. No comments were updated.")
