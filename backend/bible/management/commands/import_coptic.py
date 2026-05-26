"""
Coptic SCRIPTORIUM コーパス（CoNLL-U 形式）インポートコマンド。

使い方:
  python manage.py import_coptic /path/to/corpora-master/corpora-master
  python manage.py import_coptic /path/to/corpora-master --corpus AP
  python manage.py import_coptic /path/to/corpora-master --skip-en

処理は冪等（get_or_create / bulk_create ignore_conflicts）なので何度実行しても安全。
"""

import json
import re
import zipfile
from pathlib import Path
from typing import Iterator

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from bible.models import Book, Chapter, Verse

from .coptic_corpus_names import (
    MULTI_BOOK_CORPORA,
    NON_CANONICAL_CORPORA,
    SINGLE_BOOK_CORPORA,
    SKIP_DIRS,
)

# ファイル名パターン
_MULTI_BOOK_STEM = re.compile(r"^(\d+)_([A-Za-z0-9]+)_(\d+)$")   # "41_Mark_01"
_SINGLE_BOOK_STEM = re.compile(r"^([A-Za-z0-9]+)_(\d+)$")          # "Mark_01"

# Book.order のベース値（言語系統別）
_ORDER_SAHIDIC = 100
_ORDER_BOHAIRIC = 200
_ORDER_OTHER = 500
_ORDER_NON_CANONICAL_SAHIDIC = 300
_ORDER_NON_CANONICAL_BOHAIRIC = 400
_ORDER_NON_CANONICAL_OTHER = 600
# 英訳版は対応するコプト語版の order + 1000
_ORDER_EN_OFFSET = 1000


def _get_language(meta_entry: dict) -> str:
    return meta_entry.get("languages") or meta_entry.get("language") or "Coptic"


def _order_base(language: str) -> int:
    if language.startswith("Bohairic"):
        return _ORDER_BOHAIRIC
    return _ORDER_SAHIDIC


def _nc_order_base(language: str) -> int:
    if language.startswith("Bohairic"):
        return _ORDER_NON_CANONICAL_BOHAIRIC
    if language.startswith("Sahidic") or "Sahidic" in language:
        return _ORDER_NON_CANONICAL_SAHIDIC
    return _ORDER_NON_CANONICAL_OTHER


def _parse_conllu(content: str) -> list[tuple[str, str | None]]:
    """CoNLL-U テキストから (コプト語文, 英訳文|None) のリストを返す。"""
    sentences: list[tuple[str, str | None]] = []
    current: dict[str, str] = {}
    for line in content.splitlines():
        if line.startswith("# text = "):
            current["text"] = line[9:].strip()
        elif line.startswith("# text_en = "):
            current["text_en"] = line[12:].strip()
        elif not line and "text" in current:
            if current["text"]:
                sentences.append((current["text"], current.get("text_en") or None))
            current = {}
    if current.get("text"):
        sentences.append((current["text"], current.get("text_en") or None))
    return sentences


def _iter_conllu(conllu_source: tuple[str, Path, str]) -> Iterator[tuple[str, str]]:
    """(stem, content) を各 .conllu ファイルについて yield する。"""
    source_type, source_path, _corpus_name = conllu_source
    if source_type == "dir":
        for f in sorted(source_path.glob("*.conllu")):
            yield f.stem, f.read_text(encoding="utf-8")
    else:  # zip
        with zipfile.ZipFile(source_path) as zf:
            for name in sorted(n for n in zf.namelist() if n.endswith(".conllu")):
                stem = name[: -len(".conllu")]
                yield stem, zf.read(name).decode("utf-8")


class Command(BaseCommand):
    help = "Coptic SCRIPTORIUM コーパスを CoNLL-U ファイルからインポートする。"

    def add_arguments(self, parser):
        parser.add_argument(
            "corpora_path",
            type=str,
            help="corpora-master ディレクトリへのパス（meta.json を含むルート）",
        )
        parser.add_argument(
            "--corpus",
            type=str,
            default=None,
            help="単一コーパスのディレクトリ名のみ処理（例: AP, thomas-gospel）",
        )
        parser.add_argument(
            "--skip-en",
            action="store_true",
            default=False,
            help="英訳（# text_en）を保存しない",
        )

    def handle(self, *args, **options):
        corpora_root = Path(options["corpora_path"])
        if not corpora_root.is_dir():
            raise CommandError(f"ディレクトリが見つかりません: {corpora_root}")

        meta_path = corpora_root / "meta.json"
        if not meta_path.exists():
            raise CommandError(f"meta.json が見つかりません: {meta_path}")

        meta: dict = json.loads(meta_path.read_text(encoding="utf-8"))
        include_en = not options["skip_en"]
        single_corpus = options.get("corpus")

        # multi-book を先に処理して canonical ordering を確立する
        all_dirs = [d for d in sorted(corpora_root.iterdir()) if d.is_dir()]
        priority = [d for d in all_dirs if d.name in MULTI_BOOK_CORPORA]
        rest = [d for d in all_dirs if d.name not in MULTI_BOOK_CORPORA]
        ordered_dirs = priority + rest

        # 非正典コーパスの order カウンター（Sahidic/Bohairic/その他 で独立）
        nc_counters: dict[str, int] = {}

        total_verses = 0
        for corpus_dir in ordered_dirs:
            dir_name = corpus_dir.name
            if dir_name in SKIP_DIRS:
                continue
            if single_corpus and dir_name != single_corpus:
                continue

            conllu_source = self._find_conllu(corpus_dir)
            if conllu_source is None:
                continue

            verses_added = self._import_corpus(
                corpus_dir, conllu_source, meta, include_en, nc_counters
            )
            total_verses += verses_added

        self.stdout.write(
            self.style.SUCCESS(f"\nインポート完了: 合計 {total_verses} 件の節を追加しました。")
        )

    def _find_conllu(self, corpus_dir: Path) -> tuple[str, Path, str] | None:
        """(source_type, source_path, corpus_name) を返す。corpus_name は CONLLU ディレクトリ名から抽出。"""
        for child in corpus_dir.iterdir():
            if "_CONLLU" in child.name:
                corpus_name = child.name.split("_CONLLU")[0]
                if child.is_dir():
                    return ("dir", child, corpus_name)
                if child.suffix == ".zip":
                    return ("zip", child, corpus_name)
        return None

    @transaction.atomic
    def _import_corpus(
        self,
        corpus_dir: Path,
        conllu_source: tuple[str, Path, str],
        meta: dict,
        include_en: bool,
        nc_counters: dict[str, int],
    ) -> int:
        corpus_name = conllu_source[2]  # CONLLU ディレクトリ名から抽出した識別子
        is_multi = corpus_name in MULTI_BOOK_CORPORA
        single_info = SINGLE_BOOK_CORPORA.get(corpus_name)
        nc_name = NON_CANONICAL_CORPORA.get(corpus_name)

        if not is_multi and single_info is None and nc_name is None:
            self.stdout.write(self.style.WARNING(f"スキップ（未定義コーパス）: {corpus_name}"))
            return 0

        self.stdout.write(f"処理中: {corpus_name}")

        # コーパス内のファイルを連番でイテレートする（非正典の chapter 番号に使用）
        file_index = 0
        verses_added = 0

        # 非正典は全ファイルが同じ Book → 先に Book を確定しない（language が必要なため最初のファイルで決定）
        nc_book_cache: dict[str, Book] = {}   # translation → Book
        nc_en_book_cache: dict[str, Book] = {}

        for stem, content in _iter_conllu(conllu_source):
            file_index += 1
            sentences = _parse_conllu(content)
            if not sentences:
                continue

            # meta.json からメタデータを取得（キーはファイルステムと一致）
            meta_entry = meta.get(stem, {})
            language = _get_language(meta_entry)

            if is_multi:
                m = _MULTI_BOOK_STEM.match(stem)
                if not m:
                    continue
                book_prefix = int(m.group(1))
                book_name = m.group(2)
                chapter_num = int(m.group(3))
                order = _order_base(language) + book_prefix
                book = self._get_or_create_book(book_name, language, order)
                en_book = (
                    self._get_or_create_book(book_name, language + " (EN)", order + _ORDER_EN_OFFSET)
                    if include_en
                    else None
                )

            elif single_info is not None:
                book_display, canonical_num = single_info
                m = _SINGLE_BOOK_STEM.match(stem)
                chapter_num = int(m.group(2)) if m else file_index
                order = _order_base(language) + canonical_num
                book = self._get_or_create_book(book_display, language, order)
                en_book = (
                    self._get_or_create_book(book_display, language + " (EN)", order + _ORDER_EN_OFFSET)
                    if include_en
                    else None
                )

            else:  # non-canonical
                chapter_num = file_index
                if language not in nc_book_cache:
                    lang_key = language
                    if lang_key not in nc_counters:
                        nc_counters[lang_key] = _nc_order_base(language)
                    order = nc_counters[lang_key]
                    nc_counters[lang_key] += 1
                    nc_book_cache[language] = self._get_or_create_book(nc_name, language, order)
                    if include_en:
                        nc_en_book_cache[language] = self._get_or_create_book(
                            nc_name, language + " (EN)", order + _ORDER_EN_OFFSET
                        )
                book = nc_book_cache[language]
                en_book = nc_en_book_cache.get(language) if include_en else None

            # Chapter を確保
            chapter, _ = Chapter.objects.get_or_create(book=book, number=chapter_num)
            en_chapter = None
            if en_book is not None:
                en_chapter, _ = Chapter.objects.get_or_create(book=en_book, number=chapter_num)

            # Verse を bulk_create（ignore_conflicts で冪等）
            coptic_verses = []
            en_verses = []
            for verse_num, (coptic_text, en_text) in enumerate(sentences, start=1):
                coptic_verses.append(
                    Verse(chapter=chapter, number=verse_num, text=coptic_text)
                )
                if en_chapter and en_text:
                    en_verses.append(
                        Verse(chapter=en_chapter, number=verse_num, text=en_text)
                    )

            created = Verse.objects.bulk_create(
                coptic_verses, batch_size=1000, ignore_conflicts=True
            )
            verses_added += len(created)

            if en_verses:
                en_created = Verse.objects.bulk_create(
                    en_verses, batch_size=1000, ignore_conflicts=True
                )
                verses_added += len(en_created)

        self.stdout.write(f"  → {verses_added} 件の節を追加")
        return verses_added

    def _get_or_create_book(self, name: str, translation: str, order: int) -> Book:
        book, created = Book.objects.get_or_create(
            name=name,
            translation=translation,
            defaults={"order": order},
        )
        if created:
            self.stdout.write(f"  書を作成: {name} ({translation})")
        return book
