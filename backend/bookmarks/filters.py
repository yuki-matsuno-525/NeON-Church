"""お気に入りを種類ごとに絞り込む／数えるための共通処理。

お気に入りには「節・章・書・コメント・翻訳企画」の5種が混ざって入るため、
画面ではタブで切り替えて表示する。その絞り込み条件と、タブに出す件数を
ここに集約する。一覧画面（/bookmarks・プロフィール）が共用する。
"""

from django.db.models import Count, Q

# 種類の名前は BookmarkSerializer.get_target_type が返す値と揃えること。
# フロントのタブもこの名前をそのまま使う。
BOOKMARK_TYPES = ("verse", "chapter", "book", "comment", "project")

# 種類ごとの絞り込み条件。Bookmark の CheckConstraint により、1件の栞は
# 必ずこのうちどれか1つだけに当てはまる。
_TYPE_FILTERS = {
    "verse": Q(canonical_book__isnull=False, verse_number__isnull=False),
    "chapter": Q(
        canonical_book__isnull=False,
        chapter_number__isnull=False,
        verse_number__isnull=True,
    ),
    "book": Q(
        canonical_book__isnull=False,
        chapter_number__isnull=True,
        verse_number__isnull=True,
    ),
    "comment": Q(comment__isnull=False),
    "project": Q(translation_project__isnull=False),
}


def filter_by_type(queryset, target_type):
    """`?type=` の指定で絞り込む。

    未指定・未知の値なら絞らない（＝「すべて」タブ）。不正な値でエラーにしないのは、
    古いブックマーク URL を開いても一覧が空にならず「すべて」で表示されるようにするため。
    """
    condition = _TYPE_FILTERS.get(target_type or "")
    if condition is None:
        return queryset
    return queryset.filter(condition)


def filter_by_location(queryset, book_slug, chapter_number=None, project_id=None):
    """読書画面が「今開いている箇所の栞だけ」を取るための絞り込み。

    読書画面は「この節に栞が付いているか」を知りたいだけなので、栞を全件取ってから
    絞ると件数が増えるほど遅くなる。ここでサーバー側に絞らせる。

    - `book_slug` のみ  : その書の書栞（章・節を持たない行）だけ。書のページ用。
    - `book_slug` + `chapter_number` : その章の章栞・節栞に加え、その章に付いたコメントへの
      コメント栞も含める。章のページはこの3種すべてを使う。
    - `project_id` のみ : その翻訳企画の栞だけ。企画のページ用。

    どれも指定が無ければ絞らない（＝従来どおり全件）。
    """
    if project_id:
        return queryset.filter(translation_project_id=project_id)
    if not book_slug:
        return queryset
    if chapter_number is None:
        return queryset.filter(
            canonical_book__slug=book_slug,
            chapter_number__isnull=True,
            verse_number__isnull=True,
        )
    return queryset.filter(
        # その章の章栞・節栞
        Q(canonical_book__slug=book_slug, chapter_number=chapter_number)
        # その章に付いたコメントへの栞
        | Q(
            comment__canonical_book__slug=book_slug,
            comment__chapter_number=chapter_number,
        )
    )


def count_by_type(queryset):
    """タブに出す件数を1回の問い合わせでまとめて数える。

    種類ごとに count() すると5往復するので、条件付き Count で一度に集計する。
    戻り値: {"all": 30, "verse": 12, "chapter": 3, "book": 5, "comment": 8, "project": 2}
    """
    return queryset.aggregate(
        all=Count("id"),
        **{name: Count("id", filter=condition) for name, condition in _TYPE_FILTERS.items()},
    )
