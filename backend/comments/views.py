from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Comment, Report, Vote
from .serializers import CommentSerializer, ReportSerializer


def _notify(recipient, actor, notification_type, comment):
    """通知を作成するヘルパー。自己通知はスキップ。"""
    if recipient == actor:
        return
    from notifications.models import Notification
    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        comment=comment,
    )


class IsOwner(permissions.BasePermission):
    """オブジェクトの所有者（user フィールド）のみ許可する。"""

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class CommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/comments/?verse_id=&ordering=new|votes  コメント一覧
    POST /api/comments/                                コメント投稿（要認証）

    verse_id / chapter_id / book_id のいずれかが必須。
    指定なしの場合は空リストを返す。
    """

    serializer_class = CommentSerializer
    throttle_scope = "comment_create"

    def get_throttles(self):
        if self.request.method == "POST":
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        comment = serializer.save()
        if comment.parent:
            _notify(
                recipient=comment.parent.user,
                actor=comment.user,
                notification_type="reply",
                comment=comment,
            )

    def get_queryset(self):
        qs = Comment.objects.select_related("user").annotate(vote_count=Count("votes"))
        params = self.request.query_params

        verse_id = params.get("verse_id")
        chapter_id = params.get("chapter_id")
        book_id = params.get("book_id")

        if verse_id:
            qs = qs.filter(verse_id=verse_id)
        elif chapter_id:
            qs = qs.filter(verse__chapter_id=chapter_id)
        elif book_id:
            qs = qs.filter(verse__chapter__book_id=book_id)
        else:
            return qs.none()

        ordering = params.get("ordering", "new")
        if ordering == "votes":
            qs = qs.order_by("-vote_count", "-created_at")
        else:
            qs = qs.order_by("-created_at")

        return qs


class CommentUpvoteView(APIView):
    """
    POST   /api/comments/{pk}/upvote/  upvote 追加（要認証、二重投票は 409）
    DELETE /api/comments/{pk}/upvote/  upvote 取り消し（未投票の場合は 404）
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        _, created = Vote.objects.get_or_create(user=request.user, comment=comment)
        if not created:
            return Response({"detail": "既に投票済みです。"}, status=status.HTTP_409_CONFLICT)
        _notify(
            recipient=comment.user,
            actor=request.user,
            notification_type="upvote",
            comment=comment,
        )
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        deleted_count, _ = Vote.objects.filter(user=request.user, comment=comment).delete()
        if not deleted_count:
            return Response({"detail": "投票が見つかりません。"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CommentDestroyView(generics.DestroyAPIView):
    """
    DELETE /api/comments/{pk}/  論理削除（自分のコメントのみ）

    物理削除は行わず is_deleted=True をセットする。
    他人のコメントに対しては 403 を返す。
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = Comment.objects.all()

    def perform_destroy(self, instance: Comment) -> None:
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReportView(APIView):
    """
    POST /api/comments/{pk}/report/  通報（要認証、同一コメントへの重複通報は 409）
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "report"

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        serializer = ReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        _, created = Report.objects.get_or_create(
            reporter=request.user,
            comment=comment,
            defaults={"reason": serializer.validated_data["reason"]},
        )
        if not created:
            return Response({"detail": "既に通報済みです。"}, status=status.HTTP_409_CONFLICT)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminCommentModerateView(APIView):
    """
    DELETE /api/comments/{pk}/moderate/  管理者による強制論理削除
    管理者（is_staff=True）のみ利用可能。所有者チェックなし。
    """

    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if not comment.is_deleted:
            comment.is_deleted = True
            comment.save(update_fields=["is_deleted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
