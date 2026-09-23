from django.db.models import Case, Count, IntegerField, Max, Min, Q, Value, When
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions

from common.pagination import StandardPageNumberPagination

from .models import PassageLink, Section, Work
from .serializers import PassageEntrySerializer, SectionSerializer, WorkSerializer

# 結び付き方の確かさの順（小さいほど確か）。
_METHOD_RANK = Case(
    When(links__method=PassageLink.Method.STRUCTURE, then=Value(0)),
    When(links__method=PassageLink.Method.CITATION, then=Value(1)),
    default=Value(2),
    output_field=IntegerField(),
)
_RANK_TO_METHOD = {0: PassageLink.Method.STRUCTURE, 1: PassageLink.Method.CITATION, 2: PassageLink.Method.AI}


def covering_links_q(book: str, chapter: int, verse: int | None, prefix: str = "") -> Q:
    """箇所 (book, chapter, verse) を範囲に含む PassageLink の条件。

    範囲は (chapter, verse) 〜 (chapter_end, verse_end)。chapter が空なら書全体、
    verse が空ならその章全体を指す。verse を渡さないときは「その章に掛かるもの」を拾う。
    prefix は Section から辿るとき用（"links__"）。
    """

    def f(name: str) -> str:
        return f"{prefix}{name}"

    whole_book = Q(**{f("chapter__isnull"): True})
    if verse is None:
        starts_before = Q(**{f("chapter__lte"): chapter})
        ends_after = Q(**{f("chapter_end__gte"): chapter})
    else:
        starts_before = Q(**{f("chapter__lt"): chapter}) | Q(**{f("chapter"): chapter}) & (
            Q(**{f("verse__isnull"): True}) | Q(**{f("verse__lte"): verse})
        )
        ends_after = Q(**{f("chapter_end__gt"): chapter}) | Q(**{f("chapter_end"): chapter}) & (
            Q(**{f("verse_end__isnull"): True}) | Q(**{f("verse_end__gte"): verse})
        )
    return Q(**{f("canonical_book__slug"): book}) & (whole_book | (starts_before & ends_after))


def _int_param(request, name: str) -> int | None:
    value = request.query_params.get(name)
    try:
        return int(value) if value not in (None, "") else None
    except ValueError:
        return None


class WorkListView(generics.ListAPIView):
    """GET /api/commentary/works/ 解釈書の一覧（時代順）。"""

    serializer_class = WorkSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Work.objects.annotate(section_count=Count("sections")).order_by(
            "year", "slug"
        )


class WorkDetailView(generics.RetrieveAPIView):
    """GET /api/commentary/works/<slug>/ 解釈書1冊の情報（出典・権利を含む）。"""

    serializer_class = WorkSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Work.objects.annotate(section_count=Count("sections"))


class AroundPagination(StandardPageNumberPagination):
    """?around=<order> を渡すと、その区切りを含むページを返す（?page があればそちらが優先）。"""

    def get_page_number(self, request, paginator):
        around = _int_param(request, "around")
        if around is not None and self.page_query_param not in request.query_params:
            # 区切りの order は 0 からの連番（loader が振る）。order // 1ページの件数 + 1 がそのページ。
            return max(around, 0) // paginator.per_page + 1
        return super().get_page_number(request, paginator)


class WorkSectionListView(generics.ListAPIView):
    """
    GET /api/commentary/works/<slug>/sections/?page=N
    GET /api/commentary/works/<slug>/sections/?around=<order>

    解釈書を頭から読むための区切りの一覧（全文）。around を渡すと、その区切りを含むページを返す
    （節のパネルから「全文を読む」で飛んできたとき用）。
    """

    serializer_class = SectionSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = AroundPagination

    def get_queryset(self):
        work = get_object_or_404(Work, slug=self.kwargs["slug"])
        return work.sections.prefetch_related("links__canonical_book").order_by("order")

    @extend_schema(parameters=[OpenApiParameter("around", OpenApiTypes.INT, description="この区切りを含むページを返す")])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class PassageKind:
    """節のパネルでの見せ分け。"""

    # この節そのものを論じている（節ごとの注解・講の対象箇所など、構造で結び付いたもの）
    DISCUSS = "discuss"
    # その章全体・書全体を扱う講義や注解（別枠で小さく出す）
    BROAD = "broad"
    # 別の話の途中でこの節に触れている（引用・AI判定。畳んで出す）
    MENTION = "mention"
    values = (DISCUSS, BROAD, MENTION)


@extend_schema(
    parameters=[
        OpenApiParameter("book", OpenApiTypes.STR, required=True, description="書の slug"),
        OpenApiParameter("chapter", OpenApiTypes.INT, required=True),
        OpenApiParameter("verse", OpenApiTypes.INT, description="省略するとその章に掛かる解釈"),
        OpenApiParameter("kind", OpenApiTypes.STR, description="discuss（既定）/ broad / mention"),
        OpenApiParameter("tradition", OpenApiTypes.STR, description="jewish / patristic など"),
    ]
)
class PassageCommentaryListView(generics.ListAPIView):
    """
    GET /api/commentary/passage/?book=<slug>&chapter=<章>&verse=<節>&kind=<discuss|broad|mention>

    その箇所についての解釈を、見せ方ごとに分けて返す（PassageKind）。
      discuss … この節（verse を省けばこの章）を直接論じている区切り
      broad …… 章全体・書全体を扱う区切り
      mention … 別の話の途中でこの箇所に触れている区切り（discuss / broad に出たものは除く）
    1つの区切りは1件にまとめる。並びは「時代 → 本 → 本の中の順」。
    """

    serializer_class = PassageEntrySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        params = self.request.query_params
        book = params.get("book")
        chapter = _int_param(self.request, "chapter")
        verse = _int_param(self.request, "verse")
        kind = params.get("kind") or PassageKind.DISCUSS
        if not book or chapter is None or kind not in PassageKind.values:
            return Section.objects.none()

        covering = covering_links_q(book, chapter, verse, prefix="links__")
        structure = covering & Q(links__method=PassageLink.Method.STRUCTURE)
        # 「直接論じている」の細かさ: 節を見ているなら節ごとの結び付き、章を見ているなら章ごと。
        # （関連をまたぐ否定 ~Q は「そういう結び付きが1つも無い」の意味になってしまうので、肯定形で書く）
        level = "links__verse__isnull" if verse is not None else "links__chapter__isnull"
        discuss = structure & Q(**{level: False})
        broad = structure & Q(**{level: True})

        if kind == PassageKind.DISCUSS:
            link_q = discuss
            qs = Section.objects.filter(link_q)
        elif kind == PassageKind.BROAD:
            link_q = broad
            qs = Section.objects.filter(link_q).exclude(id__in=Section.objects.filter(discuss).values("id"))
        else:
            link_q = covering & Q(links__method__in=[PassageLink.Method.CITATION, PassageLink.Method.AI])
            qs = Section.objects.filter(link_q).exclude(id__in=Section.objects.filter(structure).values("id"))

        tradition = params.get("tradition")
        if tradition in Work.Tradition.values:
            qs = qs.filter(work__tradition=tradition)

        return (
            qs.annotate(
                method_rank=Min(_METHOD_RANK, filter=link_q),
                best_confidence=Max("links__confidence", filter=link_q),
            )
            .select_related("work")
            .order_by("work__year", "work__slug", "order")
        )

    def paginate_queryset(self, queryset):
        page = super().paginate_queryset(queryset)
        # 集計した順位を、画面向けの名前（method / confidence）に直して載せる。
        for section in page if page is not None else []:
            section.method = _RANK_TO_METHOD[section.method_rank]
            section.confidence = section.best_confidence if section.method == PassageLink.Method.AI else None
        return page
