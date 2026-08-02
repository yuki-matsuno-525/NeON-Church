from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/             全通知一覧（新しい順）
    GET /api/notifications/?unread=1    未読のみ
    GET /api/notifications/?type=reply  種類で絞り込み（reply/upvote/mention）

    返信・高評価・メンションが1本に混ざると、数の多い高評価に返信が埋もれる。
    画面はタブで切り替えるので、その絞り込みと件数をここで用意する。
    counts は type での絞り込み前の件数（unread の指定は反映する）。
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPageNumberPagination

    def get_base_queryset(self):
        """type で絞る前の通知。件数集計にも使う。"""
        qs = Notification.objects.filter(recipient=self.request.user)
        if self.request.query_params.get("unread") == "1":
            qs = qs.filter(is_read=False)
        return qs

    def get_queryset(self):
        # 返信の返信からでも元の箇所へ飛ばすため、親を2段まで先読みしておく
        # （これ以上深いときだけ追加で辿る）。canonical_book も書名の引き当てで使う。
        qs = self.get_base_queryset().select_related(
            "actor",
            "comment",
            "comment__canonical_book",
            "comment__parent",
            "comment__parent__parent",
            "translation_comment",
            "answer",
            "answer__question",
        )
        # 未知の種類は無視して全件（＝「すべて」タブ）にする。
        target_type = self.request.query_params.get("type")
        if target_type in dict(Notification.TYPE_CHOICES):
            qs = qs.filter(notification_type=target_type)
        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data["counts"] = self.get_base_queryset().aggregate(
            all=Count("id"),
            **{
                name: Count("id", filter=Q(notification_type=name))
                for name, _label in Notification.TYPE_CHOICES
            },
        )
        return response


class NotificationReadView(APIView):
    """POST /api/notifications/{pk}/read/  個別既読"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=["is_read", "updated_at"])
        return Response(status=status.HTTP_200_OK)


class NotificationReadAllView(APIView):
    """POST /api/notifications/read-all/  全既読"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response(status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/  未読件数だけを軽量に返す。"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False
        ).count()
        return Response({"count": count}, status=status.HTTP_200_OK)
