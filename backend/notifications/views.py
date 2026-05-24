from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/          全通知一覧（新しい順）
    GET /api/notifications/?unread=1 未読のみ
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(
            recipient=self.request.user
        ).select_related("actor", "comment", "translation_comment")
        if self.request.query_params.get("unread") == "1":
            qs = qs.filter(is_read=False)
        return qs


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
