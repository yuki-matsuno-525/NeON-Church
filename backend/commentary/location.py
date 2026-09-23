"""解釈書の場所（解釈書・章番号・区切り番号）を扱う共通の小道具。

コメント・Q&A・お気に入りは、聖書の箇所と同じ列（chapter_number / verse_number）で
解釈書の場所も持つ。書にあたるのが commentary_work、節にあたるのが区切りの番号。
bible/passage.py の聖書版と対になる。
"""

from __future__ import annotations

from common.language import ui_language

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


def work_title(work: Work, lang: str) -> str:
    """画面の言語での解釈書の題。英語なら原題（日本語の本は英題）、日本語なら日本語の題。"""
    if lang == "en":
        return work.title or work.title_ja
    return work.title_ja or work.title


def chapter_title(chapter: CommentaryChapter, lang: str) -> str:
    """画面の言語での章の名前。英語の名前が無い章は元の名前のまま。"""
    if lang == "en" and chapter.title_en:
        return chapter.title_en
    return chapter.title


def commentary_location_label(work_id, chapter: int | None, number: int | None, cache: dict | None = None) -> str:
    """「カルヴァン ローマ書注解 › ローマ人への手紙 8章 › 3」のような表示用の場所。

    英語の画面（Accept-Language: en）では「Commentary on Romans › Romans 8 › 3」になる。
    """
    lang = ui_language()
    key = ("commentary", work_id, chapter, lang)
    if cache is not None and key in cache:
        title, ch_title = cache[key]
    else:
        work = Work.objects.filter(id=work_id).only("title", "title_ja").first()
        title = work_title(work, lang) if work else ""
        ch_title = ""
        if chapter is not None:
            ch = CommentaryChapter.objects.filter(work_id=work_id, number=chapter).only("title", "title_en").first()
            ch_title = (chapter_title(ch, lang) if ch and ch.title else f"{chapter}")
        if cache is not None:
            cache[key] = (title, ch_title)
    parts = [title]
    if chapter is not None:
        parts.append(ch_title)
    if number is not None:
        parts.append(str(number))
    return " › ".join(p for p in parts if p)
