"""正本 canonical_books.json に基づく CanonicalBook 解決（Book 作成の共通入口）。

Book を作る全経路（importers/loader.py・import_gospel/kvj/greek 等）は、ここの
`get_or_create_book_with_canonical` を使い、Book が必ず正しい CanonicalBook に
リンクされるようにする。正本の**完全一致のみ**を使い、書名の推測・部分一致・
大文字小文字の補正はしない。正本に無い (translation, name) は作成せずエラーにする。
"""

from __future__ import annotations

import json
from pathlib import Path

from bible.models import Book, CanonicalBook

# backend/bible/data/canonical_books.json
DATA_PATH = Path(__file__).resolve().parent / "data" / "canonical_books.json"


class CanonicalDataError(Exception):
    """正本が不正、または (translation, name) が正本で解決できないときに投げる。"""


def load_canonical_index(path: Path | str = DATA_PATH) -> dict[tuple[str, str], str]:
    """正本を検証し、(translation, name) -> slug の索引を返す。

    検証: 配列が空でない / slug が空でなく重複しない / books が空でない /
    translation・name が空でない / (translation, name) が全体で一意。
    （(translation, name) が複数 slug に割り当てられている＝曖昧、はここでエラーになる。）
    """
    path = Path(path)
    if not path.exists():
        raise CanonicalDataError(f"正本が見つかりません: {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise CanonicalDataError(f"正本 JSON を読めません: {e}")

    if not isinstance(data, list) or not data:
        raise CanonicalDataError("正本は空でない配列である必要があります。")

    seen_slugs: set[str] = set()
    index: dict[tuple[str, str], str] = {}
    for entry in data:
        slug = entry.get("slug") if isinstance(entry, dict) else None
        if not slug or not isinstance(slug, str):
            raise CanonicalDataError(f"slug が空/不正のエントリがあります: {entry}")
        if slug in seen_slugs:
            raise CanonicalDataError(f"slug が重複しています: {slug}")
        seen_slugs.add(slug)

        books = entry.get("books")
        if not isinstance(books, list) or not books:
            raise CanonicalDataError(f"books 配列が空です: slug={slug}")

        for bk in books:
            translation = bk.get("translation") if isinstance(bk, dict) else None
            name = bk.get("name") if isinstance(bk, dict) else None
            if not translation or not name:
                raise CanonicalDataError(f"translation/name が空です: slug={slug}, {bk}")
            key = (translation, name)
            if key in index:
                raise CanonicalDataError(
                    f"(translation, name) が重複しています: {translation}/{name} が "
                    f"slug={index[key]} と slug={slug} の両方に存在します。"
                )
            index[key] = slug
    return index


def resolve_slug(translation: str, book_name: str, *, index: dict | None = None) -> str:
    """(translation, name) を正本の完全一致で slug に解決する。無ければ CanonicalDataError。"""
    idx = index if index is not None else load_canonical_index()
    slug = idx.get((translation, book_name))
    if slug is None:
        raise CanonicalDataError(
            f"正本 canonical_books.json に (translation, name) が登録されていません: "
            f"{translation}/{book_name}。正本へ登録してから取り込んでください。"
        )
    return slug


def get_or_create_canonical_book_for(
    translation: str, book_name: str, *, index: dict | None = None
) -> CanonicalBook:
    """(translation, name) に対応する CanonicalBook を取得/作成して返す。"""
    slug = resolve_slug(translation, book_name, index=index)
    canon, _ = CanonicalBook.objects.get_or_create(slug=slug)
    return canon


def get_or_create_book_with_canonical(
    *, name: str, translation: str, order: int
) -> tuple[Book, bool]:
    """Book を CanonicalBook 付きで取得/作成する。全インポート経路の共通入口。

    - 正本に無い (translation, name) は作成せずエラー。
    - 既存 Book の canonical_book が NULL なら正しい値を補完する。
    - 既存 Book が別の CanonicalBook にリンク済みなら**上書きせずエラー**
      （再取り込みで誤ったリンクを隠さないため）。
    戻り値: (book, created)
    """
    canon = get_or_create_canonical_book_for(translation, name)
    book, created = Book.objects.get_or_create(
        name=name,
        translation=translation,
        defaults={"order": order, "canonical_book": canon},
    )
    if not created:
        if book.canonical_book_id is None:
            book.canonical_book = canon
            book.save(update_fields=["canonical_book"])
        elif book.canonical_book_id != canon.id:
            raise CanonicalDataError(
                f"Book {name}/{translation} は別の CanonicalBook にリンク済みです"
                f"（期待 slug={canon.slug}）。上書きしません。"
            )
    return book, created
