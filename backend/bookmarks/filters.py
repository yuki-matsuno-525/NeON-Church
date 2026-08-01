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


def count_by_type(queryset):
    """タブに出す件数を1回の問い合わせでまとめて数える。

    種類ごとに count() すると5往復するので、条件付き Count で一度に集計する。
    戻り値: {"all": 30, "verse": 12, "chapter": 3, "book": 5, "comment": 8, "project": 2}
    """
    return queryset.aggregate(
        all=Count("id"),
        **{name: Count("id", filter=condition) for name, condition in _TYPE_FILTERS.items()},
    )
