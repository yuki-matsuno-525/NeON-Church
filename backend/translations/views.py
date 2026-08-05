"""翻訳企画の HTTP 入口。

ここは「URL とパラメータを解く」「権限を確かめる」「シリアライズして返す」だけ。
何が見えるかの判断は selectors.py、状態を変える処理は services.py にある。
"""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwnerOf
from common.schema import DetailSerializer

from . import selectors, services
from .access import (
    can_view_project_work,
    get_visible_project_or_404 as resolve_visible_project_or_404,
)
from .models import Language, TranslationProject, TranslationUnit
from .serializers import (
    BookAddedSerializer,
    BookRemovedSerializer,
    BookSelectionSerializer,
    LanguageSerializer,
    MembershipDecisionSerializer,
    TranslationCommentSerializer,
    TranslationMembershipSerializer,
    TranslationProjectSerializer,
    TranslationReadResponseSerializer,
    TranslationUnitCreateSerializer,
    TranslationUnitSerializer,
    TranslationUnitSummaryResponseSerializer,
    UnitAssignSerializer,
)

# 既存の import 経路を保つための別名。他アプリやテストが
# translations.views.annotate_project_summary を参照している。
annotate_project_summary = selectors.annotate_project_summary


class IsProjectOwner(IsOwnerOf):
    """企画を立てた人だけに許す。ユニット等が渡ったら企画をたどる。"""

    parent_attr = "project"


class IsApprovedMember(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        project_id = view.kwargs.get("project_id")
        if not project_id:
            return False
        # 見えない企画の存在を、権限エラーの違いから当てられないようにする。
        _get_visible_project_or_404(request, project_id)
        return selectors.is_approved_member(request.user, project_id)


def _can_view_project_work(request, project):
    """Draft work is private to the owner and approved collaborators."""
    return can_view_project_work(request.user, project)


def _get_visible_project_or_404(request, project_id):
    return resolve_visible_project_or_404(request.user, project_id)


# ---------------------------------------------------------------------------
# プロジェクト
# ---------------------------------------------------------------------------


class TranslationProjectListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/translations/  プロジェクト一覧（認証不要・20件ページング）
        ?status=published|active|draft でステータス列ごとに、?page=N でページ送りできる。
        一覧は3カラムのボードなので、フロントは列ごとに独立してページングする。
    POST /api/translations/  プロジェクト作成（要認証）
    """

    serializer_class = TranslationProjectSerializer
    pagination_class = StandardPageNumberPagination

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return selectors.list_projects(
            self.request.user,
            status=self.request.query_params.get("status"),
            query=self.request.query_params.get("q"),
        )

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user, status=TranslationProject.STATUS_DRAFT)
        services.register_owner_membership(project)


class TranslationProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/translations/{id}/  プロジェクト詳細
    PATCH  /api/translations/{id}/  編集（オーナーのみ）
    DELETE /api/translations/{id}/  削除（オーナーのみ）
    """

    serializer_class = TranslationProjectSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsProjectOwner()]

    def get_object(self):
        visible_project = _get_visible_project_or_404(self.request, self.kwargs["project_id"])
        obj = generics.get_object_or_404(
            selectors.projects_with_summary(self.request.user), pk=visible_project.pk
        )
        self.check_object_permissions(self.request, obj)
        return obj


def _set_project_status(view, request, project_id, new_status):
    """ステータス遷移3つ（公開・取り消し・募集開始）で共通の入口。

    オーナー確認（check_object_permissions）はここで行う。IsProjectOwner は
    オブジェクト単位の判定なので、URL から企画を引いたあとに通す必要がある。
    """
    project = _get_visible_project_or_404(request, project_id)
    view.check_object_permissions(request, project)
    services.set_project_status(project, new_status)
    return Response(TranslationProjectSerializer(project, context={"request": request}).data)


class TranslationPublishView(APIView):
    """POST /api/translations/{id}/publish/  公開（オーナーのみ）"""

    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    @extend_schema(request=None, responses={200: TranslationProjectSerializer})
    def post(self, request, project_id):
        return _set_project_status(self, request, project_id, TranslationProject.STATUS_PUBLISHED)


class TranslationUnpublishView(APIView):
    """POST /api/translations/{id}/unpublish/  公開取り消し → active（オーナーのみ）"""

    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    @extend_schema(request=None, responses={200: TranslationProjectSerializer})
    def post(self, request, project_id):
        return _set_project_status(self, request, project_id, TranslationProject.STATUS_ACTIVE)


class TranslationActivateView(APIView):
    """POST /api/translations/{id}/activate/  募集開始 draft → active（オーナーのみ）"""

    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    @extend_schema(request=None, responses={200: TranslationProjectSerializer})
    def post(self, request, project_id):
        return _set_project_status(self, request, project_id, TranslationProject.STATUS_ACTIVE)


# ---------------------------------------------------------------------------
# メンバーシップ
# ---------------------------------------------------------------------------


class TranslationJoinView(APIView):
    """POST /api/translations/{id}/join/  参加申請（要認証）"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={201: TranslationMembershipSerializer, 400: DetailSerializer},
    )
    def post(self, request, project_id):
        project = _get_visible_project_or_404(request, project_id)
        membership = services.apply_to_project(project, request.user)
        return Response(
            TranslationMembershipSerializer(membership).data, status=status.HTTP_201_CREATED
        )


class TranslationMemberListView(generics.ListAPIView):
    """GET /api/translations/{id}/members/  メンバー一覧（承認済みメンバーのみ閲覧可）

    参加者は増え続けうるので、1回のリクエストで全件返さないようページングする。
    """

    serializer_class = TranslationMembershipSerializer
    permission_classes = [IsApprovedMember]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        return selectors.project_members(self.kwargs["project_id"])


class TranslationMemberDetailView(APIView):
    """
    PATCH  /api/translations/{id}/members/{mid}/  承認/拒否（オーナーのみ）
    DELETE /api/translations/{id}/members/{mid}/  除名（オーナーのみ）
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_project(self, project_id, request):
        project = _get_visible_project_or_404(request, project_id)
        if project.owner != request.user:
            self.permission_denied(request)
        return project

    @extend_schema(
        request=MembershipDecisionSerializer,
        responses={200: TranslationMembershipSerializer, 400: DetailSerializer},
    )
    def patch(self, request, project_id, membership_id):
        self._get_project(project_id, request)
        membership = services.decide_membership(
            project_id, membership_id, request.data.get("status")
        )
        return Response(TranslationMembershipSerializer(membership).data)

    @extend_schema(responses={204: None})
    def delete(self, request, project_id, membership_id):
        self._get_project(project_id, request)
        services.remove_member(project_id, membership_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# ユニット
# ---------------------------------------------------------------------------


class ChapterPageNumberPagination(StandardPageNumberPagination):
    """1章分をまとめて返せる大きさのページ。

    翻訳画面は章を選んで作業するので、章の途中で切れると使いものにならない。
    詩篇119篇（176節）でも1ページに収まる大きさにしてある。章を指定しない
    取得（企画全体）でも、際限なく返さないための上限として効く。
    """

    page_size = 200
    max_page_size = 500


class TranslationUnitListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/translations/{id}/units/            ユニット一覧
    GET  /api/translations/{id}/units/?chapter=3  3章のユニットだけ
    POST /api/translations/{id}/units/            ユニット追加（オーナーのみ）

    書を丸ごと追加できる（add-book）ので、企画全体では数千件になりうる。
    画面は章を選んで作業するため、章で絞って取れるようにしてある。
    """

    serializer_class = TranslationUnitSerializer
    pagination_class = ChapterPageNumberPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TranslationUnitCreateSerializer
        return TranslationUnitSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        _get_visible_project_or_404(self.request, self.kwargs["project_id"])
        params = self.request.query_params
        return selectors.project_units(
            self.kwargs["project_id"],
            chapter=params.get("chapter"),
            status=params.get("status"),
            assigned_to=params.get("assigned_to"),
            user=self.request.user,
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.request.method not in permissions.SAFE_METHODS:
            ctx["project"] = self._get_owned_project_or_404()
        return ctx

    def _get_owned_project_or_404(self):
        if not hasattr(self, "_owned_project"):
            project = _get_visible_project_or_404(self.request, self.kwargs["project_id"])
            if project.owner_id != self.request.user.id:
                self.permission_denied(self.request)
            self._owned_project = project
        return self._owned_project

    def perform_create(self, serializer):
        serializer.save(project=self._get_owned_project_or_404())


class TranslationUnitSummaryView(APIView):
    """GET /api/translations/{id}/units/summary/  章の一覧と状態ごとの件数

    画面の章ボタンと「レビュー(N)」のバッジを出すためだけの軽い問い合わせ。
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: TranslationUnitSummaryResponseSerializer})
    def get(self, request, project_id):
        _get_visible_project_or_404(request, project_id)
        return Response(selectors.unit_summary(project_id, request.user))


class TranslationUnitDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET   /api/translations/{id}/units/{uid}/  ユニット詳細
    PATCH /api/translations/{id}/units/{uid}/  訳文・ステータス更新（担当者またはオーナー）
    """

    serializer_class = TranslationUnitSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_object(self):
        project = _get_visible_project_or_404(self.request, self.kwargs["project_id"])
        return generics.get_object_or_404(
            TranslationUnit.objects.select_related("project", "verse__chapter", "assigned_to"),
            pk=self.kwargs["unit_id"],
            project=project,
        )

    def update(self, request, *args, **kwargs):
        if not services.can_update_unit(self.get_object(), request.user):
            return Response(
                {"detail": "Only the assignee or owner can update."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        unit = self.get_object()
        if unit.project.owner != request.user:
            return Response(
                {"detail": "Only the owner can delete a unit."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class TranslationUnitAssignView(APIView):
    """POST /api/translations/{id}/units/{uid}/assign/  担当者割り当て（オーナーのみ）"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=UnitAssignSerializer,
        responses={200: TranslationUnitSerializer, 403: DetailSerializer},
    )
    def post(self, request, project_id, unit_id):
        project = services.require_owner(
            _get_visible_project_or_404(request, project_id), request.user
        )
        unit = services.assign_unit(project, unit_id, request.data.get("user_id"))
        return Response(TranslationUnitSerializer(unit).data)


# ---------------------------------------------------------------------------
# コメント
# ---------------------------------------------------------------------------


class TranslationCommentListCreateView(generics.ListCreateAPIView):
    """プロジェクト全体コメント or ユニットコメント（GET: 誰でも, POST: 承認済みメンバー）

    コメントは利用者が好きなだけ増やせるので、1回のリクエストで全件返さないようページングする。
    フロントは「もっと見る」で読み足す。
    """

    serializer_class = TranslationCommentSerializer
    pagination_class = StandardPageNumberPagination

    def get_permissions(self):
        # POST は承認済みメンバーのみ（IsApprovedMember が kwargs["project_id"] を参照する）
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsApprovedMember()]

    def get_queryset(self):
        project_id = self.kwargs["project_id"]
        _get_visible_project_or_404(self.request, project_id)
        return selectors.project_comments(project_id, self.kwargs.get("unit_id"))

    def perform_create(self, serializer):
        project, unit = services.comment_target(
            self.kwargs["project_id"], self.kwargs.get("unit_id")
        )
        comment = serializer.save(project=project, unit=unit, user=self.request.user)
        services.create_mention_notifications(comment)


class TranslationCommentDeleteView(APIView):
    """DELETE /api/translations/{id}/comments/{cid}/  コメント論理削除（投稿者またはオーナー）"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={204: None, 403: DetailSerializer})
    def delete(self, request, project_id, comment_id):
        _get_visible_project_or_404(request, project_id)
        services.soft_delete_comment(project_id, comment_id, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TranslationAddBookView(APIView):
    """
    POST /api/translations/{id}/add-book/
    指定した書のすべての節を翻訳ユニットとして一括追加（オーナーのみ）。
    すでに存在するユニットはスキップ（冪等）。
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=BookSelectionSerializer,
        responses={201: BookAddedSerializer, 400: DetailSerializer, 403: DetailSerializer},
    )
    def post(self, request, project_id):
        project = services.require_owner(
            _get_visible_project_or_404(request, project_id), request.user
        )
        book = services.resolve_book(request.data.get("book_id"))
        created = services.add_book_units(project, book)
        return Response(
            {"created": created, "book_name": book.name},
            status=status.HTTP_201_CREATED,
        )


class TranslationRemoveBookView(APIView):
    """
    DELETE /api/translations/{id}/remove-book/
    指定した書のすべての翻訳ユニットを削除（オーナーのみ）。
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=BookSelectionSerializer,
        responses={200: BookRemovedSerializer, 400: DetailSerializer, 403: DetailSerializer},
    )
    def delete(self, request, project_id):
        project = services.require_owner(
            _get_visible_project_or_404(request, project_id), request.user
        )
        book = services.resolve_book(request.data.get("book_id"))
        deleted = services.remove_book_units(project, book)
        return Response({"deleted": deleted, "book_name": book.name}, status=status.HTTP_200_OK)


class LanguageListView(generics.ListAPIView):
    """GET /api/translations/languages/  翻訳先言語一覧（誰でも閲覧可）"""

    queryset = Language.objects.all()
    serializer_class = LanguageSerializer
    permission_classes = [permissions.AllowAny]


class TranslationLibraryListView(generics.ListAPIView):
    """GET /api/translations/library/  自分が /read に追加した公開翻訳一覧（要認証）

    本棚は増え続けうるので、1回のリクエストで全件返さないようページングする。
    """

    serializer_class = TranslationProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        return selectors.library_projects(self.request.user)


class TranslationLibraryView(APIView):
    """
    POST   /api/translations/{id}/library/  自分の /read に追加（公開済みのみ・冪等）
    DELETE /api/translations/{id}/library/  自分の /read から削除（冪等）
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={201: TranslationProjectSerializer})
    def post(self, request, project_id):
        project = services.add_to_library(request.user, project_id)
        return Response(
            TranslationProjectSerializer(project, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(responses={204: None})
    def delete(self, request, project_id):
        services.remove_from_library(request.user, project_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TranslationReadView(APIView):
    """GET /api/translations/{id}/read/  公開済み翻訳の完了ユニット（誰でも閲覧可）

    GET .../read/            目次用。章番号の一覧だけを返す（units は空）
    GET .../read/?chapter=3  3章の本文を返す
    """

    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={200: TranslationReadResponseSerializer})
    def get(self, request, project_id):
        project = generics.get_object_or_404(
            TranslationProject,
            pk=project_id,
            status=TranslationProject.STATUS_PUBLISHED,
        )
        chapters, units = selectors.published_reading(project, request.query_params.get("chapter"))
        return Response(
            {
                "chapters": chapters,
                "units": TranslationUnitSerializer(units, many=True).data,
            }
        )
