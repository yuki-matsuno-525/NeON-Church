"""正規化した解釈書データ（1冊ぶんの dict）を検証して DB へ入れる。

データの形（commentary/seed/*.json.gz の中身）:

    {
      "slug": "irenaeus-against-heresies",
      "title": "Against Heresies", "title_ja": "異端反駁",
      "author": "Irenaeus", "author_ja": "エイレナイオス", "year": 180,
      "tradition": "patristic", "language": "en",
      "translator": "...", "source_name": "...", "source_url": "https://...",
      "license": "public-domain", "license_note": "...", "readable": true,
      "sections": [
        {"heading": "Book I, Preface", "text": "...", "source_url": "",
         "links": [{"book": "genesis", "chapter": 1, "verse": 1,
                    "chapter_end": 1, "verse_end": 3,
                    "method": "citation", "confidence": null}]}
      ]
    }

同じ slug の本がすでにあれば、区切りと箇所をいったん消して入れ直す（何度流しても同じ結果）。
"""

from __future__ import annotations

import gzip
import json
from pathlib import Path

from django.db import transaction

from bible.canonical import DATA_PATH as CANONICAL_PATH
from bible.models import CanonicalBook

from .models import PassageLink, Section, Work

WORK_FIELDS = (
    "slug", "title", "title_ja", "author", "author_ja", "year", "tradition", "language",
    "translator", "source_name", "source_url", "license", "license_note", "readable",
)
REQUIRED = ("slug", "title", "author", "tradition", "language", "source_name", "source_url", "license", "sections")


class CommentaryDataError(ValueError):
    """データの形が正しくないときに投げる。"""


def known_book_slugs() -> set[str]:
    """このサービスが持つ書の slug（bible/data/canonical_books.json が正）。"""
    data = json.loads(Path(CANONICAL_PATH).read_text(encoding="utf-8"))
    return {entry["slug"] for entry in data}


def read_seed(path: Path) -> dict:
    """seed ファイル（.json.gz または .json）を読む。"""
    raw = path.read_bytes()
    if path.suffix == ".gz":
        raw = gzip.decompress(raw)
    return json.loads(raw.decode("utf-8"))


def validate(data: dict, book_slugs: set[str]) -> None:
    """入れる前に形を確かめる。問題があれば CommentaryDataError。"""
    missing = [k for k in REQUIRED if k not in data]
    if missing:
        raise CommentaryDataError(f"必須キーがありません: {missing}")
    if data["tradition"] not in Work.Tradition.values:
        raise CommentaryDataError(f"tradition が不正です: {data['tradition']}")
    if data["license"] not in Work.License.values:
        raise CommentaryDataError(f"license が不正です: {data['license']}")
    for i, section in enumerate(data["sections"]):
        if not section.get("text"):
            raise CommentaryDataError(f"sections[{i}] の本文が空です")
        for link in section.get("links", []):
            if link["book"] not in book_slugs:
                raise CommentaryDataError(f"sections[{i}] に未知の書があります: {link['book']}")
            if link["method"] not in PassageLink.Method.values:
                raise CommentaryDataError(f"sections[{i}] の method が不正です: {link['method']}")
            if link["method"] == PassageLink.Method.AI and link.get("confidence") is None:
                raise CommentaryDataError(f"sections[{i}] の AI 判定に confidence がありません")


@transaction.atomic
def load_work(data: dict, book_slugs: set[str] | None = None) -> tuple[Work, int, int]:
    """1冊ぶんを入れる。戻り値は (Work, 区切りの数, 箇所の数)。"""
    if book_slugs is None:
        book_slugs = known_book_slugs()
    validate(data, book_slugs)

    fields = {k: data[k] for k in WORK_FIELDS if k in data and k != "slug"}
    work, _ = Work.objects.update_or_create(slug=data["slug"], defaults=fields)
    # 入れ直し。区切りを消すと箇所も一緒に消える（CASCADE）。
    work.sections.all().delete()

    sections = Section.objects.bulk_create(
        [
            Section(
                work=work,
                order=i,
                heading=(s.get("heading") or "")[:500],
                text=s["text"],
                source_url=s.get("source_url") or "",
            )
            for i, s in enumerate(data["sections"])
        ],
        batch_size=1000,
    )

    canon: dict[str, CanonicalBook] = {}
    links: list[PassageLink] = []
    for section, s in zip(sections, data["sections"]):
        for link in s.get("links", []):
            slug = link["book"]
            if slug not in canon:
                # 書の行がまだ無い環境（聖書本文の投入前など）でも入れられるよう、正本にある slug だけ作る。
                canon[slug], _ = CanonicalBook.objects.get_or_create(slug=slug)
            links.append(
                PassageLink(
                    section=section,
                    canonical_book=canon[slug],
                    chapter=link.get("chapter"),
                    verse=link.get("verse"),
                    chapter_end=link.get("chapter_end"),
                    verse_end=link.get("verse_end"),
                    method=link["method"],
                    confidence=link.get("confidence"),
                )
            )
    PassageLink.objects.bulk_create(links, batch_size=2000)
    return work, len(sections), len(links)
