"""解釈書の場所（解釈書・章番号・区切り番号）を扱う共通の小道具。

コメント・Q&A・お気に入りは、聖書の箇所と同じ列（chapter_number / verse_number）で
解釈書の場所も持つ。書にあたるのが commentary_work、節にあたるのが区切りの番号。
bible/passage.py の聖書版と対になる。
"""

from __future__ import annotations

from .models import CommentaryChapter, Section, Work


class CommentaryLocationError(ValueError):
    """指定された解釈書・章・区切りが無いとき。"""


def resolve_commentary_location(slug: str, chapter: int | None = None, number: int | None = None) -> dict:
    """slug（＋章＋区切り）を、モデルに入れる列の dict にする。無い場所なら CommentaryLocationError。

    返り値は `Comment(**resolve_commentary_location(...))` の形でそのまま使える。
    """
    work = Work.objects.filter(slug=slug).first()
    if work is None:
        raise CommentaryLocationError("解釈書が見つかりません")
    if number is not None and chapter is None:
        raise CommentaryLocationError("区切りを指定するときは章も指定してください")
    if chapter is not None and not CommentaryChapter.objects.filter(work=work, number=chapter).exists():
        raise CommentaryLocationError("章が見つかりません")
    if number is not None and not Section.objects.filter(work=work, chapter_number=chapter, number=number).exists():
        raise CommentaryLocationError("区切りが見つかりません")
    return {"commentary_work": work, "chapter_number": chapter, "verse_number": number}


def commentary_location_filter(slug: str, chapter=None, number=None) -> dict:
    """slug（＋章＋区切り）を queryset の filter 条件へ変換する（粒度は指定の細かさで決まる）。"""
    loc: dict = {"commentary_work__slug": slug}
    if number:
        loc.update(chapter_number=chapter, verse_number=number)
    elif chapter:
        loc.update(chapter_number=chapter, verse_number__isnull=True)
    else:
        loc.update(chapter_number__isnull=True, verse_number__isnull=True)
    return loc


def commentary_location_label(work_id, chapter: int | None, number: int | None, cache: dict | None = None) -> str:
    """「カルヴァン ローマ書注解 › ローマ人への手紙 8章 › 3」のような表示用の場所。"""
    key = ("commentary", work_id, chapter)
    if cache is not None and key in cache:
        work_title, chapter_title = cache[key]
    else:
        work = Work.objects.filter(id=work_id).only("title", "title_ja").first()
        work_title = (work.title_ja or work.title) if work else ""
        chapter_title = ""
        if chapter is not None:
            ch = CommentaryChapter.objects.filter(work_id=work_id, number=chapter).only("title").first()
            chapter_title = (ch.title if ch and ch.title else f"{chapter}")
        if cache is not None:
            cache[key] = (work_title, chapter_title)
    parts = [work_title]
    if chapter is not None:
        parts.append(chapter_title)
    if number is not None:
        parts.append(str(number))
    return " › ".join(p for p in parts if p)
