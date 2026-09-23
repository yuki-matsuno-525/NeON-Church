from django.db.models import Count, IntegerField, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics, permissions

from common.pagination import StandardPageNumberPagination

from .models import CommentaryChapter, PassageLink, Section, Work
from .serializers import (
    EXCERPT_LENGTH,
    ChapterDetailSerializer,
    PassageEntrySerializer,
    SectionSerializer,
    WorkDetailSerializer,
    WorkSerializer,
)

# 結び付き方の確かさの順（小さいほど確か）。
_METHOD_RANK = {PassageLink.Method.STRUCTURE: 0, PassageLink.Method.CITATION: 1, PassageLink.Method.AI: 2}


def covering_links_q(book: str, chapter: int, verse: int | None) -> Q:
    """箇所 (book, chapter, verse) を範囲に含む PassageLink の条件。

    範囲は (chapter, verse) 〜 (chapter_end, verse_end)。chapter が空なら書全体、
    verse が空ならその章全体を指す。verse を渡さないときは「その章に掛かるもの」を拾う。
    """
    whole_book = Q(chapter__isnull=True)
    if verse is None:
        starts_before = Q(chapter__lte=chapter)
        ends_after = Q(chapter_end__gte=chapter)
    else:
        starts_before = Q(chapter__lt=chapter) | Q(chapter=chapter) & (Q(verse__isnull=True) | Q(verse__lte=verse))
        ends_after = Q(chapter_end__gt=chapter) | Q(chapter_end=chapter) & (
            Q(verse_end__isnull=True) | Q(verse_end__gte=verse)
        )
    return Q(canonical_book__slug=book) & (whole_book | (starts_before & ends_after))


def with_counts(queryset):
    """解釈書に区切りの数と章の数を付ける。

    Count("sections") と Count("chapters") を1つの問い合わせで数えると、区切り×章の行ができて
    とても遅くなる（区切り5,730・章52の本で30万行）。それぞれを別の小さな問い合わせで数える。
    """

    def count_of(model):
        return Coalesce(
            Subquery(
                model.objects.filter(work=OuterRef("pk"))
                .order_by()
                .values("work")
                .annotate(n=Count("pk"))
                .values("n"),
                output_field=IntegerField(),
            ),
            0,
        )

    return queryset.annotate(section_count=count_of(Section), chapter_count=count_of(CommentaryChapter))


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
        return with_counts(Work.objects.all()).order_by("year", "slug")


class WorkDetailView(generics.RetrieveAPIView):
    """GET /api/commentary/works/<slug>/ 解釈書の書のページ用（出典・権利・章の一覧）。"""

    serializer_class = WorkDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return with_counts(Work.objects.all()).prefetch_related("chapters")


class ChapterDetailView(generics.RetrieveAPIView):
    """GET /api/commentary/works/<slug>/chapters/<章番号>/ 解釈書の章のページの上の部分。"""

    serializer_class = ChapterDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        return get_object_or_404(
            CommentaryChapter.objects.select_related("work").prefetch_related("links__canonical_book"),
            work__slug=self.kwargs["slug"],
            number=self.kwargs["number"],
        )


class ChapterSectionListView(generics.ListAPIView):
    """
    GET /api/commentary/works/<slug>/chapters/<章番号>/sections/?page=N

    その章の区切り（聖書の節にあたる）。抜粋集では1章に数百件あるので、ページで区切って返す。
    """

    serializer_class = SectionSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        chapter = get_object_or_404(
            CommentaryChapter, work__slug=self.kwargs["slug"], number=self.kwargs["number"]
        )
        return (
            Section.objects.filter(work_id=chapter.work_id, chapter_number=chapter.number)
            .prefetch_related("links__canonical_book")
            .order_by("number")
        )


class PassageKind:
    """節のパネルでの見せ分け。"""

    # この節そのものを論じている（節ごとの注解・講の対象箇所など、構造で結び付いたもの）
    DISCUSS = "discuss"
    # その章全体・書全体を扱う講義や注解（別枠で小さく出す）
    BROAD = "broad"
    # 別の話の途中でこの節に触れている（引用・AI判定。畳んで出す）
    MENTION = "mention"
    values = (DISCUSS, BROAD, MENTION)


def _target_key(link: PassageLink) -> tuple[str, str]:
    return ("section", str(link.section_id)) if link.section_id else ("chapter", str(link.commentary_chapter_id))


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
      discuss … この節（verse を省けばこの章）を直接論じている区切り・章
      broad …… 章全体・書全体を扱う区切り・章
      mention … 別の話の途中でこの箇所に触れている区切り（discuss / broad に出たものは除く）
    1つの区切り（または章）は1件にまとめる。並びは「時代 → 本 → 章 → 区切り」。
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
            return []

        links = list(
            PassageLink.objects.filter(covering_links_q(book, chapter, verse)).only(
                "section_id", "commentary_chapter_id", "method", "confidence", "chapter", "verse"
            )
        )
        # 「直接論じている」の細かさ: 節を見ているなら節ごとの結び付き、章を見ているなら章ごと。
        narrow = (lambda lk: lk.verse is not None) if verse is not None else (lambda lk: lk.chapter is not None)
        structure = [lk for lk in links if lk.method == PassageLink.Method.STRUCTURE]
        discuss_keys = {_target_key(lk) for lk in structure if narrow(lk)}

        if kind == PassageKind.DISCUSS:
            chosen = [lk for lk in structure if narrow(lk)]
        elif kind == PassageKind.BROAD:
            chosen = [lk for lk in structure if not narrow(lk) and _target_key(lk) not in discuss_keys]
        else:
            structure_keys = {_target_key(lk) for lk in structure}
            chosen = [lk for lk in links if lk.method != PassageLink.Method.STRUCTURE
                      and _target_key(lk) not in structure_keys]

        # 1つの区切り（章）に結び付きが複数あれば、一番確かなものを代表にする。
        best: dict[tuple[str, str], PassageLink] = {}
        for lk in chosen:
            key = _target_key(lk)
            if key not in best or _METHOD_RANK[lk.method] < _METHOD_RANK[best[key].method]:
                best[key] = lk
        entries = self._entries(best, params.get("tradition"))
        entries.sort(key=lambda e: (e["work"].year if e["work"].year is not None else 9999, e["work"].slug,
                                    e["chapter_number"], e["number"] or 0))
        return entries

    def _entries(self, best: dict, tradition: str | None) -> list[dict]:
        section_ids = [k[1] for k in best if k[0] == "section"]
        chapter_ids = [k[1] for k in best if k[0] == "chapter"]
        works = Work.objects.all()
        if tradition in Work.Tradition.values:
            works = works.filter(tradition=tradition)
        entries = []
        sections = Section.objects.filter(id__in=section_ids, work__in=works).select_related("work")
        titles = {
            (c.work_id, c.number): c.title
            for c in CommentaryChapter.objects.filter(work__in={s.work_id for s in sections})
        }
        for s in sections:
            lk = best[("section", str(s.id))]
            entries.append(self._entry(s.id, s.work, s.chapter_number, s.number,
                                       titles.get((s.work_id, s.chapter_number), ""), s.heading, s.text, lk))
        chapters = CommentaryChapter.objects.filter(id__in=chapter_ids, work__in=works).select_related("work")
        first_texts = {
            (s.work_id, s.chapter_number): s.text
            for s in Section.objects.filter(number=1, work__in={c.work_id for c in chapters})
        }
        for c in chapters:
            lk = best[("chapter", str(c.id))]
            entries.append(self._entry(c.id, c.work, c.number, None, c.title, c.title,
                                       first_texts.get((c.work_id, c.number), ""), lk))
        return entries

    @staticmethod
    def _entry(target_id, work, chapter_number, number, chapter_title, heading, text, link) -> dict:
        return {
            "id": str(target_id),
            "chapter_number": chapter_number,
            "number": number,
            "chapter_title": chapter_title,
            "heading": heading,
            "excerpt": text[:EXCERPT_LENGTH],
            "truncated": len(text) > EXCERPT_LENGTH,
            "work": work,
            "method": link.method,
            "confidence": link.confidence if link.method == PassageLink.Method.AI else None,
        }
