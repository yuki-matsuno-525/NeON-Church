"""翻訳企画の「読み出し」。

ビューは URL とパラメータを解いてここを呼ぶだけにする。
どの行が誰に見えるか・どう数えるかの判断は全部この中にある。

書き込みは services.py。可視性の素の判定は access.py。
"""

from django.db.models import Count, Exists, OuterRef, Q, QuerySet

from .models import (
    TranslationComment,
    TranslationLibraryEntry,
    TranslationMembership,
    TranslationProject,
    TranslationUnit,
)

# 一覧をこの並びで返す。集計を足すと Django は Meta.ordering を「無い」ものとして
# 扱い、ページングが不安定になったと警告する。並び順は変えずに明示しておく。
_PROJECT_ORDERING = "-created_at"


def annotate_project_summary(queryset: QuerySet, user) -> QuerySet:
    """一覧に出す「ユニット数・完了数・参加中か・本棚にあるか」を本体クエリで求める。

    シリアライザ側で数えると1件につき4回（count/count/exists/exists）問い合わせるので、
    20件のページで80回の往復になっていた。ここで1回にまとめる。

    ユニット数と完了数は同じ units への JOIN を共有するので、件数は二重に数えられない。
    参加中・本棚は Exists のサブクエリなので行を増やさない。
    """
    queryset = queryset.annotate(
        annotated_unit_count=Count("units"),
        annotated_done_count=Count("units", filter=Q(units__status=TranslationUnit.STATUS_DONE)),
    )
    if user and user.is_authenticated:
        queryset = queryset.annotate(
            annotated_is_member=Exists(
                TranslationMembership.objects.filter(
                    project=OuterRef("pk"),
                    user=user,
                    # is_member は作業権限を表す。申請中は membership_status で
                    # 区別し、承認されるまではメンバー扱いにしない。
                    status=TranslationMembership.STATUS_APPROVED,
                )
            ),
            annotated_is_in_library=Exists(
                TranslationLibraryEntry.objects.filter(project=OuterRef("pk"), user=user)
            ),
        )
    return queryset.order_by(_PROJECT_ORDERING)


def visible_projects(user) -> QuerySet:
    """`user` に見えてよい企画。

    下書きは持ち主と承認済みメンバーだけに見せる。未ログインには公開・募集中だけ。
    """
    qs = TranslationProject.objects.select_related("owner", "source_book")
    if not user or not user.is_authenticated:
        return qs.exclude(status=TranslationProject.STATUS_DRAFT)
    return qs.filter(
        Q(owner=user)
        | Q(
            memberships__user=user,
            memberships__status=TranslationMembership.STATUS_APPROVED,
        )
        | ~Q(status=TranslationProject.STATUS_DRAFT)
    ).distinct()


def list_projects(user, *, status: str | None = None, query: str | None = None) -> QuerySet:
    """一覧のボード1カラム分。status が未知の値なら絞らない（全件）。"""
    qs = visible_projects(user)

    valid_statuses = {
        TranslationProject.STATUS_PUBLISHED,
        TranslationProject.STATUS_ACTIVE,
        TranslationProject.STATUS_DRAFT,
    }
    if status in valid_statuses:
        qs = qs.filter(status=status)

    q = (query or "").strip()
    if q:
        qs = qs.filter(
            Q(name__icontains=q)
            | Q(description__icontains=q)
            | Q(source_book__name__icontains=q)
            | Q(owner__username__icontains=q)
        )
    return annotate_project_summary(qs, user)


def projects_with_summary(user) -> QuerySet:
    """詳細取得用。可視性の判定は access.get_visible_project_or_404 が済ませた前提。"""
    return annotate_project_summary(
        TranslationProject.objects.select_related("owner", "source_book"), user
    )


def library_projects(user) -> QuerySet:
    """自分が /read に追加した公開企画。"""
    qs = TranslationProject.objects.filter(
        library_entries__user=user,
        status=TranslationProject.STATUS_PUBLISHED,
    ).select_related("owner", "source_book")
    return annotate_project_summary(qs, user)


def is_approved_member(user, project_id) -> bool:
    """作業権限を持つ承認済みメンバーか。申請中は含めない。"""
    if not user or not user.is_authenticated:
        return False
    return TranslationMembership.objects.filter(
        project_id=project_id,
        user=user,
        status=TranslationMembership.STATUS_APPROVED,
    ).exists()


def project_members(project_id) -> QuerySet:
    """メンバー一覧。ページングするので並び順を決めておく。"""
    return (
        TranslationMembership.objects.filter(project_id=project_id)
        .select_related("user")
        .order_by("created_at")
    )


def project_units(
    project_id,
    *,
    chapter: str | None = None,
    status: str | None = None,
    assigned_to: str | None = None,
    user=None,
) -> QuerySet:
    """作業画面のユニット一覧。値が読めない絞り込みは黙って無視する（画面由来のため）。"""
    qs = TranslationUnit.objects.filter(project_id=project_id).select_related(
        "verse__chapter", "assigned_to"
    )
    if chapter:
        try:
            qs = qs.filter(verse__chapter__number=int(chapter))
        except ValueError:
            pass
    if status in dict(TranslationUnit.STATUS_CHOICES):
        qs = qs.filter(status=status)

    if assigned_to == "me":
        if not user or not user.is_authenticated:
            return qs.none()
        qs = qs.filter(assigned_to=user)
    elif assigned_to == "unassigned":
        qs = qs.filter(assigned_to__isnull=True)
    elif assigned_to:
        # 画面から来る文字列。Django が UUID へ寄せるので、そのまま渡してよい。
        qs = qs.filter(assigned_to_id=assigned_to)  # type: ignore[misc]
    return qs


def _distinct_chapter_numbers(units: QuerySet) -> list[int]:
    """ユニットが載っている章番号。

    order_by() で既定の並び順を外してから distinct する。付けたままだと
    並び替えに使う節番号が裏で SELECT に入り、章が節の数だけ重複する。
    """
    return sorted(units.order_by().values_list("verse__chapter__number", flat=True).distinct())


def unit_summary(project_id, user) -> dict:
    """章ボタンと「レビュー(N)」バッジのための集計。

    全ユニットを取ってから画面側で数えると、章ボタンを見るだけで企画の全節
    （詩篇なら2400件超）が飛ぶ。DB 側で数えて必要な数だけ返す。
    """
    units = TranslationUnit.objects.filter(project_id=project_id)

    counts = units.aggregate(
        total=Count("id"),
        **{
            name: Count("id", filter=Q(status=name))
            for name, _label in TranslationUnit.STATUS_CHOICES
        },
    )
    total = counts.pop("total")

    chapter_counts: dict[int, dict] = {}
    for row in (
        units.values("verse__chapter__number", "status")
        .annotate(count=Count("id"))
        .order_by("verse__chapter__number")
    ):
        number = row["verse__chapter__number"]
        entry = chapter_counts.setdefault(
            number,
            {
                "number": number,
                "total": 0,
                "status_counts": {name: 0 for name, _label in TranslationUnit.STATUS_CHOICES},
            },
        )
        entry["status_counts"][row["status"]] = row["count"]
        entry["total"] += row["count"]

    mine = 0
    if user and user.is_authenticated:
        mine = units.filter(assigned_to=user).exclude(status=TranslationUnit.STATUS_DONE).count()

    return {
        "chapters": _distinct_chapter_numbers(units),
        "chapter_summaries": list(chapter_counts.values()),
        "status_counts": counts,
        "assigned_to_me": mine,
        "total": total,
    }


def published_reading(project, chapter: str | None) -> tuple[list[int], QuerySet | list]:
    """公開済み企画の読み物。chapter 未指定なら目次だけ（本文は返さない）。

    常に全章を返すと、1章開くたびに書全体が飛ぶ。章で絞れるようにしてある。
    """
    done = TranslationUnit.objects.filter(project=project, status=TranslationUnit.STATUS_DONE)
    chapters = _distinct_chapter_numbers(done)

    units: QuerySet | list = []
    if chapter:
        try:
            chapter_number = int(chapter)
        except ValueError:
            return chapters, []
        units = (
            done.filter(verse__chapter__number=chapter_number)
            .select_related("verse__chapter")
            .order_by("verse__number")
        )
    return chapters, units


def project_comments(project_id, unit_id=None) -> QuerySet:
    """企画全体のコメント（unit_id なし）か、ユニットへのコメント。混ぜない。"""
    qs = TranslationComment.objects.filter(project_id=project_id).select_related("user")
    if unit_id:
        return qs.filter(unit_id=unit_id)
    return qs.filter(unit__isnull=True)
