"""読書進捗の書き込み。"""

from common.exceptions import BadRequest

from .models import ReadingProgress


def save_progress(user, book_id, chapter_id) -> tuple[ReadingProgress, bool]:
    """進捗を保存する（user + book で upsert）。返り値の bool は新規かどうか。

    同じ書を読み直したときに行が増えないよう、書ごとに1行だけ持つ。
    """
    if not book_id or not chapter_id:
        raise BadRequest("book, chapter は必須です。")

    return ReadingProgress.objects.update_or_create(
        user=user,
        book_id=book_id,
        defaults={"chapter_id": chapter_id},
    )
