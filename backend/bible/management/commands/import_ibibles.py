"""ibibles.net 形式のテキストから聖書を1訳ぶんインポートする汎用コマンド。

データ: https://download.ibibles.net/{code}.zip を展開すると得られる比較用テキスト。
形式（1ファイルに全書）:
    =000 Bible begins
    =001 Genesis
    Ge 1:1 Ge 1:1 In the beginning God created ...
    Ge 1:2 Ge 1:2 And the earth was without form ...
    =002 Exodus
    Ex 1:1 Ex 1:1 ...
  - `=NNN 書名` が書の区切り（NNN は ibibles の書索引。001-039=旧約, 101-127=新約）。
  - 本文行は `略号 章:節 略号 章:節 本文`（参照が2回繰り返され、そのあと本文）。

使い方:
  python manage.py import_ibibles --txt /path/to/kjv.txt --translation "KJV"

冪等（get_or_create）。CanonicalBook への紐づけは共通入口 get_or_create_book_with_canonical
を通すため、対象の (translation, 書名) を先に canonical_books.json へ登録しておく必要がある
（未登録なら明示エラー）。書名は txt のヘッダ名をそのまま Book.name に使う。
"""

import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from bible.canonical import (
    CanonicalDataError,
    get_or_create_book_with_canonical,
    load_canonical_index,
)
from bible.models import Chapter, Verse

# ibibles の書索引 → 訳非依存の slug（プロテスタント66冊）。
# 第二正典（トビト書等）は LXX 取り込み時に追記する。
INDEX_TO_SLUG = {
    "001": "genesis", "002": "exodus", "003": "leviticus", "004": "numbers",
    "005": "deuteronomy", "006": "joshua", "007": "judges", "008": "ruth",
    "009": "1-samuel", "010": "2-samuel", "011": "1-kings", "012": "2-kings",
    "013": "1-chronicles", "014": "2-chronicles", "015": "ezra", "016": "nehemiah",
    "017": "esther", "018": "job", "019": "psalms", "020": "proverbs",
    "021": "ecclesiastes", "022": "song-of-songs", "023": "isaiah", "024": "jeremiah",
    "025": "lamentations", "026": "ezekiel", "027": "daniel", "028": "hosea",
    "029": "joel", "030": "amos", "031": "obadiah", "032": "jonah", "033": "micah",
    "034": "nahum", "035": "habakkuk", "036": "zephaniah", "037": "haggai",
    "038": "zechariah", "039": "malachi",
    "101": "matthew", "102": "mark", "103": "luke", "104": "john", "105": "acts",
    "106": "romans", "107": "1-corinthians", "108": "2-corinthians", "109": "galatians",
    "110": "ephesians", "111": "philippians", "112": "colossians",
    "113": "1-thessalonians", "114": "2-thessalonians", "115": "1-timothy",
    "116": "2-timothy", "117": "titus", "118": "philemon", "119": "hebrews",
    "120": "james", "121": "1-peter", "122": "2-peter", "123": "1-john",
    "124": "2-john", "125": "3-john", "126": "jude", "127": "revelation",
}

_HEADER_RE = re.compile(r"^=(\d+)\s+(.+?)\s*$")
_VERSE_RE = re.compile(r"^\S+\s+(\d+):(\d+)\s+(.*)$")
# 本文の先頭に重複した参照（例: "Ge 1:1 "）が付く場合に取り除く。
_DUP_REF_RE = re.compile(r"^\S+\s+\d+:\d+\s+")


def parse_ibibles_text(text: str):
    """ibibles テキストを [(index, header_name, {(章,節): 本文})] に変換する。"""
    books = []
    idx = name = None
    verses: dict[tuple[int, int], str] = {}

    def flush():
        if idx is not None and verses:
            books.append((idx, name, dict(verses)))

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line:
            continue
        h = _HEADER_RE.match(line)
        if h:
            flush()
            idx, name = h.group(1), h.group(2).strip()
            verses = {}
            continue
        m = _VERSE_RE.match(line)
        if m and idx is not None:
            ch, vs = int(m.group(1)), int(m.group(2))
            body = m.group(3)
            body = _DUP_REF_RE.sub("", body, count=1).strip()
            if body:
                verses[(ch, vs)] = body
    flush()
    return books


class Command(BaseCommand):
    help = "ibibles.net 形式のテキストから聖書を1訳ぶんインポートする（冪等）。"

    def add_arguments(self, parser):
        parser.add_argument("--txt", required=True, help="ibibles の比較用テキストファイルのパス")
        parser.add_argument("--translation", required=True, help="訳名（Book.translation・例: KJV）")

    def handle(self, *args, **options):
        path = Path(options["txt"])
        translation = options["translation"]
        if not path.is_file():
            raise CommandError(f"ファイルが見つかりません: {path}")

        books = parse_ibibles_text(path.read_text(encoding="utf-8"))
        if not books:
            raise CommandError(f"書を1つも解析できませんでした: {path}")

        # 書名は正本 canonical_books.json を単一ソースにする（この訳の slug -> 書名）。
        # 未登録の書はスキップするので、正本に足したぶんだけ段階的に取り込める。
        try:
            index_map = load_canonical_index()
        except CanonicalDataError as e:
            raise CommandError(str(e))
        slug_to_name = {slug: name for (t, name), slug in index_map.items() if t == translation}

        imported = skipped_books = 0
        for index, header_name, verses in books:
            slug = INDEX_TO_SLUG.get(index)
            name = slug_to_name.get(slug) if slug else None
            if name is None:
                skipped_books += 1
                continue
            self._import_book(index, name, translation, verses)
            imported += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"{translation}: {imported} 書をインポート（正本未登録などでスキップ {skipped_books} 書）"
            )
        )

    @transaction.atomic
    def _import_book(self, index, name, translation, verses):
        try:
            book, created = get_or_create_book_with_canonical(
                name=name, translation=translation, order=int(index)
            )
        except CanonicalDataError as e:
            raise CommandError(str(e))

        added = 0
        for (ch_num, v_num), text in verses.items():
            chapter, _ = Chapter.objects.get_or_create(book=book, number=ch_num)
            _, v_created = Verse.objects.get_or_create(
                chapter=chapter, number=v_num, defaults={"text": text}
            )
            if v_created:
                added += 1
        mark = "作成" if created else "既存"
        self.stdout.write(f"  [{mark}] {name}（{translation}） 節+{added}")
