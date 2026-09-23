"""解釈書の場所に付いている、利用者のもの（コメント・Q&A・お気に入り・記事の引用・プラン）を集める。

seed の入れ直しで番号がずれないかを確かめるのに使う（loader.check_positions_kept）。
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Work


def attached_positions(work: "Work") -> set[tuple[int | None, int | None]]:
    """(章番号, 区切り番号) の集合。書全体へのものは (None, None)、章へのものは (章番号, None)。

    コメント・Q&A・お気に入り・記事の引用・プランの章を集める。
    """
    from bookmarks.models import Bookmark
    from comments.models import Comment
    from qa.models import Question

    from articles.models import ArticleCitation
    from plans.models import PlanDayReading

    positions: set[tuple[int | None, int | None]] = set()
    for model in (Comment, Question, Bookmark):
        positions.update(
            model.objects.filter(commentary_work=work).values_list("chapter_number", "verse_number").distinct()
        )
    # 記事の引用は区切りの範囲で付くので、範囲の中の区切りを全部数える。
    for chapter, start, end in ArticleCitation.objects.filter(commentary_work=work).values_list(
        "chapter_number", "verse_number_start", "verse_number_end"
    ):
        if start is None:
            positions.add((chapter, None))
        else:
            positions.update((chapter, n) for n in range(start, (end or start) + 1))
    # プランは章ごとに読む。
    positions.update(
        (chapter, None) for chapter in PlanDayReading.objects.filter(commentary_work=work).values_list(
            "chapter_number", flat=True
        )
    )
    return positions
