"""記事の HTTP 入口。

どの記事が誰に見えるかは selectors.py、保存と引用の抽出は services.py。
"""

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwnerOf

from . import selectors, services
from .models import Article, ArticleComment
from .serializers import (
    ArticleCommentSerializer,
    ArticleDetailSerializer,
    ArticleListSerializer,
    ArticleTagSerializer,
    ArticleWriteSerializer,
)


class IsArticleOwner(IsOwnerOf):
    """記事の書き手だけに許す。"""


class ArticleListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/articles/        記事一覧。既定は公開記事のみ。
                               ?mine=true で自分の記事（下書き含む）、?tag=<slug> で主題、
                               ?author=<ユーザー名> で書いた人で絞る。
                               ?exclude_mine=true で自分の記事を公開一覧から除く。
    POST /api/articles/        記事を作る（要認証）
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        return ArticleWriteSerializer if self.request.method == "POST" else ArticleListSerializer

    def get_queryset(self):
        return selectors.list_articles(self.request.user, self.request.query_params)

    def perform_create(self, serializer):
        services.save_with_citations(serializer, owner=self.request.user)


class ArticleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/articles/{id}/   記事1件。下書き・限定公開は書いた人だけ。
    PATCH  /api/articles/{id}/   書き換え（書いた人だけ）
    DELETE /api/articles/{id}/   削除。コメントも一緒に消える（書いた人だけ）
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsArticleOwner]

    def get_serializer_class(self):
        return ArticleDetailSerializer if self.request.method == "GET" else ArticleWriteSerializer

    def get_queryset(self):
        return selectors.articles_with_citations()

    def get_object(self):
        article = super().get_object()
        # 読むだけなら、公開・限定公開は誰でも見てよい。下書きは書いた人だけ。
        if self.request.method == "GET":
            is_owner = (
                self.request.user.is_authenticated and article.owner_id == self.request.user.id
            )
            if article.visibility == Article.VISIBILITY_PRIVATE and not is_owner:
                self.permission_denied(self.request, message="この記事は下書きです。")
        return article

    def check_object_permissions(self, request, obj):
        # GET は get_object 側で判定するので、書き手チェックは書き換え系だけに掛ける。
        if request.method != "GET":
            super().check_object_permissions(request, obj)

    def perform_update(self, serializer):
        services.save_with_citations(serializer)


class ArticleCitingListView(generics.ListAPIView):
    """
    GET /api/articles/citing/?book=<書のslug>&chapter=<章>&verse=<節>

    その節を引用している公開記事。節のページの「引用した記事」タブで使う。
    """

    serializer_class = ArticleListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        return selectors.articles_citing(self.request.query_params)


class ArticleTagListView(generics.ListAPIView):
    """
    GET /api/article-tags/   主題タグの一覧。記事が1件も無いタグは出さない。
    """

    serializer_class = ArticleTagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return selectors.used_tags()


class ArticleCommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/articles/{id}/comments/   記事へのコメント（記事全体に対してのみ付く）
    POST /api/articles/{id}/comments/   コメントする（要認証）

    コメントは利用者が好きなだけ増やせるので、1回のリクエストで全件返さないようページングする。
    """

    serializer_class = ArticleCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardPageNumberPagination

    def get_article(self):
        # get_queryset と get_serializer_context の両方から呼ばれるので、
        # 1リクエストにつき1回だけ引く（そのままだと同じ問い合わせが2回走る）。
        if not hasattr(self, "_article"):
            self._article = get_object_or_404(
                selectors.visible_articles(self.request.user), pk=self.kwargs["pk"]
            )
        return self._article

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["article"] = self.get_article()
        return context

    def get_queryset(self):
        return selectors.article_comments(self.get_article())

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, article=self.get_article())


class ArticleCommentDestroyView(generics.DestroyAPIView):
    """
    DELETE /api/article-comments/{id}/   自分のコメントを消す（論理削除。返信の親を保つため）
    """

    # 削除は本文を返さないので実行時には使われないが、スキーマ生成が
    # 対象の型を決められるように置いておく。
    serializer_class = ArticleCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ArticleComment.objects.all()

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.user_id != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        services.soft_delete_comment(comment)
        return Response(status=status.HTTP_204_NO_CONTENT)
