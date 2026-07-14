import re

from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination
from notifications.models import Notification
from .models import TranslationProject, TranslationMembership, TranslationUnit, TranslationComment, TranslationLibraryEntry, Language

User = get_user_model()


def _create_mention_notifications(comment: TranslationComment) -> None:
    """コメント本文の @username を解析して通知を作成する。自己メンションは無視。"""
    usernames = set(re.findall(r"@([\w]+)", comment.body))
    if not usernames:
        return
    users = User.objects.filter(username__in=usernames).exclude(pk=comment.user_id)
    notifications = [
        Notification(
            recipient=u,
            actor=comment.user,
            notification_type=Notification.MENTION,
            translation_comment=comment,
        )
        for u in users
    ]
    Notification.objects.bulk_create(notifications, ignore_conflicts=True)
from .serializers import (
    LanguageSerializer,
    TranslationProjectSerializer,
    TranslationMembershipSerializer,
    TranslationUnitSerializer,
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
        return TranslationMembership.objects.filter(
            project_id=project_id,
            user=request.user,
            status=TranslationMembership.STATUS_APPROVED,
        ).exists()


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
            from django.db.models import Q
            qs = qs.filter(Q(owner=user) | ~Q(status=TranslationProject.STATUS_DRAFT))
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
        obj = get_object_or_404(
            TranslationProject.objects.select_related("owner", "source_book"),
            pk=self.kwargs["project_id"],
        )
        self.check_object_permissions(self.request, obj)
        return obj


def _set_project_status(view, request, project_id, new_status):
    """プロジェクトのステータスを更新して返す共通ヘルパー。

    オーナーチェック（check_object_permissions）込み。
    TranslationActivateView / TranslationPublishView / TranslationUnpublishView が共用する。
    """
    project = get_object_or_404(TranslationProject, pk=project_id)
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
        project = get_object_or_404(TranslationProject, pk=project_id)
        membership, created = TranslationMembership.objects.get_or_create(
            project=project,
            user=request.user,
            defaults={"role": TranslationMembership.ROLE_MEMBER, "status": TranslationMembership.STATUS_PENDING},
        )
        if not created:
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
        project = get_object_or_404(TranslationProject, pk=project_id)
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

class TranslationUnitListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/translations/{id}/units/  ユニット一覧
    POST /api/translations/{id}/units/  ユニット追加（オーナーのみ）
    """

    serializer_class = TranslationUnitSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return TranslationUnit.objects.filter(
            project_id=self.kwargs["project_id"]
        ).select_related("verse__chapter", "assigned_to")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.request.method not in permissions.SAFE_METHODS:
            ctx["project"] = get_object_or_404(TranslationProject, pk=self.kwargs["project_id"])
        return ctx

    def perform_create(self, serializer):
        project = get_object_or_404(TranslationProject, pk=self.kwargs["project_id"])
        if project.owner != self.request.user:
            self.permission_denied(self.request)
        serializer.save(project=project)


class TranslationUnitDetailView(generics.RetrieveUpdateAPIView):
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
        return get_object_or_404(
            TranslationUnit.objects.select_related("verse__chapter", "assigned_to"),
            pk=self.kwargs["unit_id"],
            project_id=self.kwargs["project_id"],
        )

    def update(self, request, *args, **kwargs):
        unit = self.get_object()
        project = unit.project
        if project.owner != request.user and unit.assigned_to != request.user:
            return Response({"detail": "Only the assignee or owner can update."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)


class TranslationUnitAssignView(APIView):
    """POST /api/translations/{id}/units/{uid}/assign/  担当者割り当て（オーナーのみ）"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, project_id, unit_id):
        project = get_object_or_404(TranslationProject, pk=project_id)
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
        if unit_id:
            _create_mention_notifications(comment)


class TranslationCommentDeleteView(APIView):
    """DELETE /api/translations/{id}/comments/{cid}/  コメント論理削除（投稿者またはオーナー）"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, project_id, comment_id):
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
        project = get_object_or_404(TranslationProject, pk=project_id)
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
        project = get_object_or_404(TranslationProject, pk=project_id)
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
        project = get_object_or_404(TranslationProject, pk=project_id)
        if project.status != TranslationProject.STATUS_PUBLISHED:
            return Response(
                {"detail": "公開されていないプロジェクトは追加できません。"},
                status=status.HTTP_400_BAD_REQUEST,
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
    """GET /api/translations/{id}/read/  公開済み翻訳の完了ユニット一覧（誰でも閲覧可）"""

    permission_classes = [permissions.AllowAny]

    def get(self, request, project_id):
        project = get_object_or_404(TranslationProject, pk=project_id)
        if project.status != TranslationProject.STATUS_PUBLISHED:
            return Response({"detail": "公開されていないプロジェクトです。"}, status=status.HTTP_403_FORBIDDEN)
        units = TranslationUnit.objects.filter(
            project=project, status=TranslationUnit.STATUS_DONE
        ).select_related("verse__chapter").order_by("verse__chapter__number", "verse__number")
        return Response(TranslationUnitSerializer(units, many=True).data)
