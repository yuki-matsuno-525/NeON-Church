"""コメントの HTTP 入口。

どのコメントが誰に見えるか・どう絞るかは selectors.py、
投票・通報・削除の規則は services.py。
"""

from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwner
from common.schema import DetailSerializer

from . import selectors, services
from .models import Comment
from .serializers import CommentSerializer, ReportSerializer


class CommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/comments/?verse_id=&ordering=new|votes  コメント一覧（親コメントのみ）
    GET  /api/comments/?parent_id=<id>                 そのコメントへの返信一覧
    POST /api/comments/                                コメント投稿（要認証）

    verse_id / chapter_id / book_id / book_slug / parent_id のいずれかが必須。
    指定なしの場合は空リストを返す。絞り込みの詳しい規則は selectors.thread_comments。
    """

    serializer_class = CommentSerializer
    pagination_class = StandardPageNumberPagination
    throttle_scope = "comment_create"

    def get_throttles(self):
        if self.request.method == "POST":
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return selectors.thread_comments(self.request.user, self.request.query_params)

    def create(self, request, *args, **kwargs):
        services.resolve_visible_targets(request.user, request.data)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        services.check_scope_visible(
            self.request.user, services.scope_project(serializer.validated_data)
        )
        services.notify_reply(serializer.save())


class CommentUpvoteView(APIView):
    """
    POST   /api/comments/{pk}/upvote/  upvote 追加（要認証、二重投票は 409）
    DELETE /api/comments/{pk}/upvote/  upvote 取り消し（未投票の場合は 404）
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={201: None, 409: DetailSerializer})
    def post(self, request, pk):
        comment = selectors.get_visible_comment_or_404(request.user, pk=pk)
        services.add_vote(request.user, comment)
        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None, 404: DetailSerializer})
    def delete(self, request, pk):
        comment = selectors.get_visible_comment_or_404(request.user, pk=pk)
        services.remove_vote(request.user, comment)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CommentUpdateDestroyView(generics.UpdateAPIView, generics.DestroyAPIView):
    """
    PATCH  /api/comments/{pk}/  body の編集（自分のコメントのみ、削除済みは不可）
    DELETE /api/comments/{pk}/  論理削除（自分のコメントのみ）

    物理削除は行わず is_deleted=True をセットする。
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = Comment.objects.all()
    http_method_names = ["patch", "delete", "head", "options"]

    def get_object(self):
        instance = selectors.get_visible_comment_or_404(self.request.user, pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, instance)
        return instance

    def get_serializer(self, *args, **kwargs):
        from .serializers import CommentEditSerializer

        kwargs.setdefault("context", self.get_serializer_context())
        return CommentEditSerializer(*args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        services.ensure_editable(instance)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CommentSerializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        services.soft_delete(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyCommentListView(generics.ListAPIView):
    """GET /api/comments/mine/  ログインユーザー自身のコメント一覧（削除済み除く、新着順）"""

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        from .serializers import MyCommentSerializer

        return MyCommentSerializer

    def get_queryset(self):
        return selectors.own_comments(self.request.user)


class TrendingCommentView(generics.ListAPIView):
    """GET /api/comments/trending/  トレンドコメント（vote数順トップ5、認証不要）"""

    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        from .serializers import TrendingCommentSerializer

        return TrendingCommentSerializer

    def get_queryset(self):
        return selectors.trending_comments()


class ReportView(APIView):
    """
    POST /api/comments/{pk}/report/  通報（要認証、同一コメントへの重複通報は 409）
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "report"

    @extend_schema(
        request=ReportSerializer,
        responses={201: ReportSerializer, 400: DetailSerializer, 409: DetailSerializer},
    )
    def post(self, request, pk):
        comment = selectors.get_visible_comment_or_404(request.user, pk=pk)
        serializer = ReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.report(request.user, comment, serializer.validated_data["reason"])
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminCommentModerateView(APIView):
    """
    DELETE /api/comments/{pk}/moderate/  管理者による強制論理削除
    管理者（is_staff=True）のみ利用可能。所有者チェックなし。
    """

    permission_classes = [permissions.IsAdminUser]

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        services.moderate(pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
