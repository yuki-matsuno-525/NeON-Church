"""通知の HTTP 入口。

何が見えるか・どう数えるかは selectors.py、既読にする処理は services.py。
"""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination

from . import selectors, services
from .serializers import NotificationSerializer


class UnreadCountSerializer(serializers.Serializer):
    """未読件数だけを返す軽量レスポンス。"""

    count = serializers.IntegerField()


class NotificationListView(generics.ListAPIView):
    """
    GET /api/notifications/             全通知一覧（新しい順）
    GET /api/notifications/?unread=1    未読のみ
    GET /api/notifications/?type=reply  種類で絞り込み（reply/upvote/mention）

    counts は type での絞り込み前の件数（unread の指定は反映する）。
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        return selectors.list_notifications(self.request.user, self.request.query_params)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data["counts"] = selectors.counts_by_type(
            selectors.base_notifications(
                request.user, unread_only=request.query_params.get("unread") == "1"
            )
        )
        return response


class NotificationReadView(APIView):
    """POST /api/notifications/{pk}/read/  個別既読"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: None})
    def post(self, request, pk):
        services.mark_read(request.user, pk)
        return Response(status=status.HTTP_200_OK)


class NotificationReadAllView(APIView):
    """POST /api/notifications/read-all/  全既読"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: None})
    def post(self, request):
        services.mark_all_read(request.user)
        return Response(status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/  未読件数だけを軽量に返す。"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: UnreadCountSerializer})
    def get(self, request):
        return Response({"count": selectors.unread_count(request.user)}, status=status.HTTP_200_OK)
