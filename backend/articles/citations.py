"""
記事の本文に埋め込む「引用の印」の読み取りと解決。

印の書式（書く人が手で打つことは想定せず、編集画面の引用パネルから挿入する）:

    文中の参照    [[matthew 6:16-18]]      → (マタイによる福音書 6:16-18) というリンクになる
    引用ブロック  {{matthew 6:16-18}}      → 節の本文が出る
    訳の指定      {{matthew 6:16-18|greek}}  → 縦棒のあとに訳名
    1節だけ       [[matthew 6:16]]
    章まるごと    [[matthew 6]]            → 参照のみ。引用ブロックでは長すぎるので認めない

先頭の "matthew" は訳に依らない書の slug（CanonicalBook.slug）。
これにより、読む人がどの訳を使っていても同じ印が通用する。
"""

import re
from collections import defaultdict

from django.db.models import Q

from bible.models import Book, CanonicalBook, Verse

# 本文から印を抜き出す。改行をまたぐ印は認めない（書きかけの括弧を拾わないため）。
INLINE_MARK_PATTERN = re.compile(r"\[\[([^\[\]\n]+)\]\]")
BLOCK_MARK_PATTERN = re.compile(r"\{\{([^{}\n]+)\}\}")

# 印の中身。例: "matthew 6:16-18|greek"
REFERENCE_PATTERN = re.compile(
    r"^\s*(?P<slug>[a-z0-9][a-z0-9\-_]*)"
    r"\s+(?P<chapter>\d{1,3})"
    r"(?::(?P<start>\d{1,3})(?:\s*-\s*(?P<end>\d{1,3}))?)?"
    r"(?:\s*\|\s*(?P<translation>[^|]+?))?\s*$"
)

# 好んで使う既定の訳。指定が無いときはこれを探し、無ければ最初の訳を使う。
DEFAULT_TRANSLATION = "口語訳"


def parse_body(body: str) -> list[dict]:
    """
    本文から印を読み取る。

    同じ印が2回出てきたら1つにまとめ、最初に出てきた位置を order にする。
    書式が壊れている印（節の指定がおかしい等）は黙って無視する
    ＝ 索引に載らないので、表示側では「見つかりません」になる。
    """
    found: dict[str, dict] = {}

    marks = [(m, "inline") for m in INLINE_MARK_PATTERN.finditer(body)]
    marks += [(m, "block") for m in BLOCK_MARK_PATTERN.finditer(body)]
    # 本文に出てくる順に並べ替える（inline と block を混ぜたので位置で並べ直す）
    marks.sort(key=lambda pair: pair[0].start())

    for order, (match, kind) in enumerate(marks):
        raw = match.group(0)
        if raw in found:
            continue
        reference = parse_reference(match.group(1))
        if reference is None:
            continue
        # 章まるごとの引用ブロックは認めない（長すぎるため）。参照としてなら通す。
        if kind == "block" and reference["verse_number_start"] is None:
            continue
        found[raw] = {"raw": raw, "kind": kind, "order": order, **reference}

    return list(found.values())


def parse_reference(inner: str) -> dict | None:
    """印の中身を、書の slug ・章・節の範囲・訳に分解する。読めなければ None。"""
    match = REFERENCE_PATTERN.match(inner)
    if match is None:
        return None

    start = int(match.group("start")) if match.group("start") else None
    end = int(match.group("end")) if match.group("end") else start
    # 「6:18-16」のような逆さまの範囲は読めないものとして扱う
    if start is not None and end is not None and end < start:
        return None

    translation = (match.group("translation") or "").strip()
    return {
        "book_slug": match.group("slug"),
        "chapter_number": int(match.group("chapter")),
        "verse_number_start": start,
        "verse_number_end": end,
        "translation": translation,
    }


def sync_citations(article) -> None:
    """
    記事の本文から索引（ArticleCitation）を作り直す。

    本文が正本なので、保存のたびに全部消して作り直す。差分を取るより単純で、
    ずれが起きない。引用の数はせいぜい数十なので、この作り方で困らない。
    """
    from .models import ArticleCitation

    parsed = parse_body(article.body)

    # 書の slug をまとめて引く。存在しない slug の印は索引に載せない。
    slugs = {item["book_slug"] for item in parsed}
    books_by_slug = {
        book.slug: book for book in CanonicalBook.objects.filter(slug__in=slugs)
    }

    article.citations.all().delete()
    ArticleCitation.objects.bulk_create(
        [
            ArticleCitation(
                article=article,
                raw=item["raw"],
                kind=item["kind"],
                canonical_book=books_by_slug[item["book_slug"]],
                chapter_number=item["chapter_number"],
                verse_number_start=item["verse_number_start"],
                verse_number_end=item["verse_number_end"],
                translation=item["translation"],
                order=item["order"],
            )
            for item in parsed
            if item["book_slug"] in books_by_slug
        ]
    )


def resolve_citations(citations) -> list[dict]:
    """
    索引を、画面に出せる形（書名・節の本文つき）に変える。

    フロントは raw（印の文字列）を目印に本文を置き換えるので、raw を必ず返す。
    索引に無い印は、この一覧にも入らない ＝ 表示側で「見つかりません」になる。
    """
    citations = list(citations)
    if not citations:
        return []

    editions = _editions_by_canonical_book(citations)
    chosen = {
        citation.id: _pick_edition(
            editions.get(citation.canonical_book_id, []), citation.translation
        )
        for citation in citations
    }
    verses = _verses_by_chapter(citations, chosen)

    resolved = []
    for citation in citations:
        book = chosen[citation.id]
        if book is None:
            # 書はあるが、その書の訳が1つも無い（通常は起きない）
            resolved.append(_not_found(citation))
            continue

        body_verses = []
        if citation.kind == citation.KIND_BLOCK:
            in_chapter = verses.get((book.id, citation.chapter_number), [])
            body_verses = [
                {"number": verse.number, "text": verse.text}
                for verse in in_chapter
                if citation.verse_number_start <= verse.number <= citation.verse_number_end
            ]
            if not body_verses:
                resolved.append(_not_found(citation))
                continue

        resolved.append(
            {
                "raw": citation.raw,
                "kind": citation.kind,
                "found": True,
                "label": _label(book.name, citation),
                "book_slug": citation.canonical_book.slug,
                "book_name": book.name,
                "chapter_number": citation.chapter_number,
                "verse_number_start": citation.verse_number_start,
                "verse_number_end": citation.verse_number_end,
                # 実際に使った訳。指定した訳が無かったときは既定の訳の名前が入る。
                "translation": book.translation,
                "verses": body_verses,
            }
        )
    return resolved


def _not_found(citation) -> dict:
    return {
        "raw": citation.raw,
        "kind": citation.kind,
        "found": False,
        "label": citation.raw,
        "book_slug": citation.canonical_book.slug,
        "book_name": "",
        "chapter_number": citation.chapter_number,
        "verse_number_start": citation.verse_number_start,
        "verse_number_end": citation.verse_number_end,
        "translation": citation.translation,
        "verses": [],
    }


def _label(book_name: str, citation) -> str:
    if citation.verse_number_start is None:
        return f"{book_name} {citation.chapter_number}章"
    if citation.verse_number_end and citation.verse_number_end != citation.verse_number_start:
        return (
            f"{book_name} {citation.chapter_number}:"
            f"{citation.verse_number_start}-{citation.verse_number_end}"
        )
    return f"{book_name} {citation.chapter_number}:{citation.verse_number_start}"


def _editions_by_canonical_book(citations) -> dict:
    """引用に出てくる書の、全部の訳をまとめて引く。"""
    book_ids = {citation.canonical_book_id for citation in citations}
    grouped = defaultdict(list)
    for book in Book.objects.filter(canonical_book_id__in=book_ids):
        grouped[book.canonical_book_id].append(book)
    return grouped


def _pick_edition(editions: list, translation: str):
    """
    使う訳を選ぶ。指定があればその訳、無ければ既定の訳、それも無ければ最初の訳。

    指定した訳が存在しなくても既定の訳にたおす（記事が壊れるより、
    出典に別の訳名が出ているほうが書いた人も気づける）。
    """
    if not editions:
        return None
    if translation:
        for book in editions:
            if book.translation == translation:
                return book
    for book in editions:
        if book.translation == DEFAULT_TRANSLATION:
            return book
    return sorted(editions, key=lambda book: book.order)[0]


def _verses_by_chapter(citations, chosen) -> dict:
    """引用ブロックに必要な節の本文を、1回のクエリでまとめて引く。"""
    condition = Q()
    has_any = False
    for citation in citations:
        book = chosen[citation.id]
        if book is None or citation.kind != citation.KIND_BLOCK:
            continue
        if citation.verse_number_start is None:
            continue
        condition |= Q(
            chapter__book=book,
            chapter__number=citation.chapter_number,
            number__gte=citation.verse_number_start,
            number__lte=citation.verse_number_end,
        )
        has_any = True

    if not has_any:
        return {}

    grouped = defaultdict(list)
    for verse in Verse.objects.filter(condition).select_related("chapter"):
        grouped[(verse.chapter.book_id, verse.chapter.number)].append(verse)
    return grouped
