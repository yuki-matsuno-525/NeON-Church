import re

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination
from notifications.models import Notification
from notifications.services import send_user_notification
from .access import (
    can_view_project_work,
    get_visible_project_or_404 as resolve_visible_project_or_404,
)
from .models import TranslationProject, TranslationMembership, TranslationUnit, TranslationComment, TranslationLibraryEntry, Language

User = get_user_model()


def _create_mention_notifications(comment: TranslationComment) -> None:
    """コメント本文の @username を解析して通知を作成する。自己メンションは無視。"""
    usernames = set(re.findall(r"@([\w]+)", comment.body))
    if not usernames:
        return
    users = User.objects.filter(username__in=usernames).exclude(pk=comment.user_id)
    for user in users:
        send_user_notification(
            recipient=user,
            actor=comment.user,
            notification_type=Notification.MENTION,
            translation_comment=comment,
        )
from .serializers import (
    LanguageSerializer,
    TranslationProjectSerializer,
    TranslationMembershipSerializer,
    TranslationUnitSerializer,
    TranslationUnitCreateSerializer,
    TranslationCommentSerializer,
)


class IsProjectOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, TranslationProject):
            return obj.owner == request.user
        return obj.project.owner == request.user


class IsApprovedMember(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        project_id = view.kwargs.get("project_id")
        if not project_id:
            return False
        _get_visible_project_or_404(request, project_id)
        return TranslationMembership.objects.filter(
            project_id=project_id,
            user=request.user,
            status=TranslationMembership.STATUS_APPROVED,
        ).exists()


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
        qs = TranslationProject.objects.select_related("owner", "source_book")
        user = self.request.user
        if user.is_authenticated:
            qs = qs.filter(
                Q(owner=user)
                | Q(
                    memberships__user=user,
                    memberships__status=TranslationMembership.STATUS_APPROVED,
                )
                | ~Q(status=TranslationProject.STATUS_DRAFT)
            ).distinct()
        else:
            qs = qs.exclude(status=TranslationProject.STATUS_DRAFT)

        # ボードの1カラム分だけ欲しいときは status で絞る（未知の値は無視して全件）。
        status_param = self.request.query_params.get("status")
        valid_statuses = {
            TranslationProject.STATUS_PUBLISHED,
            TranslationProject.STATUS_ACTIVE,
            TranslationProject.STATUS_DRAFT,
        }
        if status_param in valid_statuses:
            qs = qs.filter(status=status_param)
        q = (self.request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(name__icontains=q)
                | Q(description__icontains=q)
                | Q(source_book__name__icontains=q)
                | Q(owner__username__icontains=q)
            )
        return qs

    def perform_create(self, serializer):
        project = serializer.save(owner=self.request.user, status=TranslationProject.STATUS_DRAFT)
        TranslationMembership.objects.create(
            project=project,
            user=self.request.user,
            role=TranslationMembership.ROLE_OWNER,
            status=TranslationMembership.STATUS_APPROVED,
        )


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
        obj = _get_visible_project_or_404(self.request, self.kwargs["project_id"])
        self.check_object_permissions(self.request, obj)
        return obj


def _set_project_status(view, request, project_id, new_status):
    """プロジェクトのステータスを更新して返す共通ヘルパー。

    オーナーチェック（check_object_permissions）込み。
    TranslationActivateView / TranslationPublishView / TranslationUnpublishView が共用する。
    """
    project = _get_visible_project_or_404(request, project_id)
    view.check_object_permissions(request, project)
    project.status = new_status
    project.save(update_fields=["status", "updated_at"])
    return Response(TranslationProjectSerializer(project, context={"request": request}).data)


class TranslationPublishView(APIView):
    """POST /api/translations/{id}/publish/  公開（オーナーのみ）"""

    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def post(self, request, project_id):
        return _set_project_status(self, request, project_id, TranslationProject.STATUS_PUBLISHED)


class TranslationUnpublishView(APIView):
    """POST /api/translations/{id}/unpublish/  公開取り消し → active（オーナーのみ）"""

    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def post(self, request, project_id):
        return _set_project_status(self, request, project_id, TranslationProject.STATUS_ACTIVE)


class TranslationActivateView(APIView):
    """POST /api/translations/{id}/activate/  募集開始 draft → active（オーナーのみ）"""

    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]

    def post(self, request, project_id):
        return _set_project_status(self, request, project_id, TranslationProject.STATUS_ACTIVE)


# ---------------------------------------------------------------------------
# メンバーシップ
# ---------------------------------------------------------------------------

class TranslationJoinView(APIView):
    """POST /api/translations/{id}/join/  参加申請（要認証）"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = _get_visible_project_or_404(request, project_id)
        if project.status != TranslationProject.STATUS_ACTIVE:
            return Response(
                {"detail": "This project is not accepting applications."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership, created = TranslationMembership.objects.get_or_create(
            project=project,
            user=request.user,
            defaults={"role": TranslationMembership.ROLE_MEMBER, "status": TranslationMembership.STATUS_PENDING},
        )
        if not created:
            if membership.status == TranslationMembership.STATUS_REJECTED:
                membership.status = TranslationMembership.STATUS_PENDING
                membership.save(update_fields=["status", "updated_at"])
            else:
                return Response({"detail": "Already applied."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(TranslationMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class TranslationMemberListView(generics.ListAPIView):
    """GET /api/translations/{id}/members/  メンバー一覧（承認済みメンバーのみ閲覧可）"""

    serializer_class = TranslationMembershipSerializer
    permission_classes = [IsApprovedMember]

    def get_queryset(self):
        return TranslationMembership.objects.filter(
            project_id=self.kwargs["project_id"]
        ).select_related("user")


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

    def patch(self, request, project_id, membership_id):
        self._get_project(project_id, request)
        membership = get_object_or_404(TranslationMembership, pk=membership_id, project_id=project_id)
        new_status = request.data.get("status")
        if new_status not in [TranslationMembership.STATUS_APPROVED, TranslationMembership.STATUS_REJECTED]:
            return Response(
                {"detail": 'status must be "approved" or "rejected".'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership.status = new_status
        membership.save(update_fields=["status"])
        return Response(TranslationMembershipSerializer(membership).data)

    def delete(self, request, project_id, membership_id):
        self._get_project(project_id, request)
        membership = get_object_or_404(
            TranslationMembership,
            pk=membership_id,
            project_id=project_id,
            role=TranslationMembership.ROLE_MEMBER,
        )
        membership.delete()
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
        qs = TranslationUnit.objects.filter(
            project_id=self.kwargs["project_id"]
        ).select_related("verse__chapter", "assigned_to")
        chapter = self.request.query_params.get("chapter")
        if chapter:
            # 数字以外が来たら絞らない（画面から来る値なので握りつぶしてよい）
            try:
                qs = qs.filter(verse__chapter__number=int(chapter))
            except ValueError:
                pass
        status_param = self.request.query_params.get("status")
        if status_param in dict(TranslationUnit.STATUS_CHOICES):
            qs = qs.filter(status=status_param)
        assigned_to = self.request.query_params.get("assigned_to")
        if assigned_to == "me":
            if not self.request.user.is_authenticated:
                return qs.none()
            qs = qs.filter(assigned_to=self.request.user)
        elif assigned_to == "unassigned":
            qs = qs.filter(assigned_to__isnull=True)
        elif assigned_to:
            qs = qs.filter(assigned_to_id=assigned_to)
        return qs

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
    以前は全ユニットを取ってから画面側で数えていたので、章ボタンを見るだけで
    企画の全節（詩篇なら2400件超）が飛んでいた。

    返り値: {"chapters": [1, 2, 3], "status_counts": {"todo": 10, ...}, "total": 30}
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, project_id):
        _get_visible_project_or_404(request, project_id)
        units = TranslationUnit.objects.filter(project_id=project_id)
        # order_by() で既定の並び順を外してから distinct する。付けたままだと
        # 並び替えに使う節番号が裏で SELECT に入り、章が節の数だけ重複する。
        chapters = sorted(
            units.order_by().values_list("verse__chapter__number", flat=True).distinct()
        )
        counts = units.aggregate(
            total=Count("id"),
            **{
                name: Count("id", filter=Q(status=name))
                for name, _label in TranslationUnit.STATUS_CHOICES
            },
        )
        total = counts.pop("total")
        chapter_counts = {}
        for row in (
            units.values("verse__chapter__number", "status")
            .annotate(count=Count("id"))
            .order_by("verse__chapter__number")
        ):
            number = row["verse__chapter__number"]
            entry = chapter_counts.setdefault(number, {
                "number": number,
                "total": 0,
                "status_counts": {name: 0 for name, _label in TranslationUnit.STATUS_CHOICES},
            })
            entry["status_counts"][row["status"]] = row["count"]
            entry["total"] += row["count"]
        mine = 0
        if request.user.is_authenticated:
            mine = units.filter(assigned_to=request.user).exclude(status=TranslationUnit.STATUS_DONE).count()
        return Response({
            "chapters": chapters,
            "chapter_summaries": list(chapter_counts.values()),
            "status_counts": counts,
            "assigned_to_me": mine,
            "total": total,
        })


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
        project = _get_visible_project_or_404(
            self.request,
            self.kwargs["project_id"],
        )
        unit = get_object_or_404(
            TranslationUnit.objects.select_related("project", "verse__chapter", "assigned_to"),
            pk=self.kwargs["unit_id"],
            project=project,
        )
        return unit

    def update(self, request, *args, **kwargs):
        unit = self.get_object()
        project = unit.project
        member_can_update = (
            unit.assigned_to == request.user
            and TranslationMembership.objects.filter(
                project=project,
                user=request.user,
                status=TranslationMembership.STATUS_APPROVED,
            ).exists()
        )
        if project.owner != request.user and not member_can_update:
            return Response({"detail": "Only the assignee or owner can update."}, status=status.HTTP_403_FORBIDDEN)
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

    def post(self, request, project_id, unit_id):
        project = _get_visible_project_or_404(request, project_id)
        if project.owner != request.user:
            return Response({"detail": "Only the owner can perform this action."}, status=status.HTTP_403_FORBIDDEN)
        unit = get_object_or_404(TranslationUnit, pk=unit_id, project=project)
        user_id = request.data.get("user_id")
        if user_id is None:
            unit.assigned_to = None
        else:
            if not TranslationMembership.objects.filter(
                project=project, user_id=user_id, status=TranslationMembership.STATUS_APPROVED
            ).exists():
                return Response(
                    {"detail": "Only approved members can be assigned."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            unit.assigned_to_id = user_id
        unit.save(update_fields=["assigned_to", "updated_at"])
        return Response(TranslationUnitSerializer(unit).data)


# ---------------------------------------------------------------------------
# コメント
# ---------------------------------------------------------------------------

class TranslationCommentListCreateView(generics.ListCreateAPIView):
    """プロジェクト全体コメント or ユニットコメント（GET: 誰でも, POST: 承認済みメンバー）"""

    serializer_class = TranslationCommentSerializer

    def get_permissions(self):
        # POST は承認済みメンバーのみ（IsApprovedMember が kwargs["project_id"] を参照する）
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsApprovedMember()]

    def get_queryset(self):
        project_id = self.kwargs["project_id"]
        _get_visible_project_or_404(self.request, project_id)
        unit_id = self.kwargs.get("unit_id")
        qs = TranslationComment.objects.filter(project_id=project_id).select_related("user")
        if unit_id:
            qs = qs.filter(unit_id=unit_id)
        else:
            qs = qs.filter(unit__isnull=True)
        return qs

    def perform_create(self, serializer):
        project = get_object_or_404(TranslationProject, pk=self.kwargs["project_id"])
        unit_id = self.kwargs.get("unit_id")
        unit = get_object_or_404(TranslationUnit, pk=unit_id, project=project) if unit_id else None
        comment = serializer.save(project=project, unit=unit, user=self.request.user)
        _create_mention_notifications(comment)


class TranslationCommentDeleteView(APIView):
    """DELETE /api/translations/{id}/comments/{cid}/  コメント論理削除（投稿者またはオーナー）"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, project_id, comment_id):
        _get_visible_project_or_404(request, project_id)
        comment = get_object_or_404(TranslationComment, pk=comment_id, project_id=project_id)
        project = comment.project
        if comment.user != request.user and project.owner != request.user:
            return Response({"detail": "Only the author or owner can delete."}, status=status.HTTP_403_FORBIDDEN)
        comment.is_deleted = True
        comment.body = ""
        comment.save(update_fields=["is_deleted", "body", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class TranslationAddBookView(APIView):
    """
    POST /api/translations/{id}/add-book/
    指定した書のすべての節を翻訳ユニットとして一括追加（オーナーのみ）。
    すでに存在するユニットはスキップ（冪等）。
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        from bible.models import Book, Verse
        project = _get_visible_project_or_404(request, project_id)
        if project.owner != request.user:
            return Response({"detail": "Only the owner can perform this action."}, status=status.HTTP_403_FORBIDDEN)
        book_id = request.data.get("book_id")
        if not book_id:
            return Response({"detail": "book_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        book = get_object_or_404(Book, pk=book_id)
        verses = Verse.objects.filter(chapter__book=book)
        created = 0
        for verse in verses:
            _, is_new = TranslationUnit.objects.get_or_create(project=project, verse=verse)
            if is_new:
                created += 1
        return Response({"created": created, "book_name": book.name}, status=status.HTTP_201_CREATED)


class TranslationRemoveBookView(APIView):
    """
    DELETE /api/translations/{id}/remove-book/
    指定した書のすべての翻訳ユニットを削除（オーナーのみ）。
    """

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, project_id):
        from bible.models import Book
        project = _get_visible_project_or_404(request, project_id)
        if project.owner != request.user:
            return Response({"detail": "Only the owner can perform this action."}, status=status.HTTP_403_FORBIDDEN)
        book_id = request.data.get("book_id")
        if not book_id:
            return Response({"detail": "book_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        book = get_object_or_404(Book, pk=book_id)
        deleted, _ = TranslationUnit.objects.filter(project=project, verse__chapter__book=book).delete()
        return Response({"deleted": deleted, "book_name": book.name}, status=status.HTTP_200_OK)


class LanguageListView(generics.ListAPIView):
    """GET /api/translations/languages/  翻訳先言語一覧（誰でも閲覧可）"""

    queryset = Language.objects.all()
    serializer_class = LanguageSerializer
    permission_classes = [permissions.AllowAny]


class TranslationLibraryListView(generics.ListAPIView):
    """GET /api/translations/library/  自分が /read に追加した公開翻訳一覧（要認証）"""

    serializer_class = TranslationProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return TranslationProject.objects.filter(
            library_entries__user=self.request.user,
            status=TranslationProject.STATUS_PUBLISHED,
        ).select_related("owner", "source_book")


class TranslationLibraryView(APIView):
    """
    POST   /api/translations/{id}/library/  自分の /read に追加（公開済みのみ・冪等）
    DELETE /api/translations/{id}/library/  自分の /read から削除（冪等）
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(
            TranslationProject,
            pk=project_id,
            status=TranslationProject.STATUS_PUBLISHED,
        )
        TranslationLibraryEntry.objects.get_or_create(user=request.user, project=project)
        return Response(
            TranslationProjectSerializer(project, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request, project_id):
        TranslationLibraryEntry.objects.filter(user=request.user, project_id=project_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TranslationReadView(APIView):
    """GET /api/translations/{id}/read/  公開済み翻訳の完了ユニット（誰でも閲覧可）

    GET .../read/            目次用。章番号の一覧だけを返す（units は空）
    GET .../read/?chapter=3  3章の本文を返す

    以前は常に全章の完了ユニットを返し、章のページが画面側で1章分だけ抜き出して
    残りを捨てていた。1章開くたびに書全体が飛ぶので、章で絞れるようにした。

    返り値: {"chapters": [1, 2, 3], "units": [...]}
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request, project_id):
        project = get_object_or_404(
            TranslationProject,
            pk=project_id,
            status=TranslationProject.STATUS_PUBLISHED,
        )
        done = TranslationUnit.objects.filter(
            project=project, status=TranslationUnit.STATUS_DONE
        )
        # order_by() で既定の並び順を外してから distinct する（節番号が裏で
        # SELECT に入って章が重複するのを防ぐ）。
        chapters = sorted(
            done.order_by().values_list("verse__chapter__number", flat=True).distinct()
        )

        chapter = request.query_params.get("chapter")
        units = []
        if chapter:
            try:
                chapter_number = int(chapter)
            except ValueError:
                chapter_number = None
            if chapter_number is not None:
                units = (
                    done.filter(verse__chapter__number=chapter_number)
                    .select_related("verse__chapter")
                    .order_by("verse__number")
                )
        return Response({
            "chapters": chapters,
            "units": TranslationUnitSerializer(units, many=True).data,
        })
