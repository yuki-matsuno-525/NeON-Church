"""解釈書の場所に付いている、利用者のもの（コメント・Q&A・お気に入り）を集める。

seed の入れ直しで番号がずれないかを確かめるのに使う（loader.check_positions_kept）。
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Work


def attached_positions(work: "Work") -> set[tuple[int | None, int | None]]:
    """(章番号, 区切り番号) の集合。書全体へのものは (None, None)、章へのものは (章番号, None)。"""
    from bookmarks.models import Bookmark
    from comments.models import Comment
    from qa.models import Question

    positions: set[tuple[int | None, int | None]] = set()
    for model in (Comment, Question, Bookmark):
        positions.update(
            model.objects.filter(commentary_work=work).values_list("chapter_number", "verse_number").distinct()
        )
    return positions
