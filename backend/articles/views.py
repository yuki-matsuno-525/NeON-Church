from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from common.pagination import StandardPageNumberPagination
from .citations import sync_citations
from .models import Article, ArticleComment, ArticleTag
from .serializers import (
    ArticleCommentSerializer,
    ArticleDetailSerializer,
    ArticleListSerializer,
    ArticleTagSerializer,
    ArticleWriteSerializer,
)


class IsArticleOwner(permissions.BasePermission):
    """記事の書き手だけに許す。Article は user ではなく owner を持つので専用に用意する。"""

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id


def _visible_articles(user):
    """その人が見てよい記事だけに絞る。公開は誰でも、下書き・限定公開は書いた人だけ。"""
    visible = Q(visibility=Article.VISIBILITY_PUBLIC)
    if user and user.is_authenticated:
        visible |= Q(owner=user)
    return Article.objects.filter(visible)


class ArticleListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/articles/        記事一覧。既定は公開記事のみ。
                               ?mine=true で自分の記事（下書き含む）、?tag=<slug> で主題、
                               ?author=<ユーザー名> で書いた人で絞る。
    POST /api/articles/        記事を作る（要認証）
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        return ArticleWriteSerializer if self.request.method == "POST" else ArticleListSerializer

    def get_queryset(self):
        user = self.request.user
        if self.request.query_params.get("mine") == "true" and user.is_authenticated:
            queryset = Article.objects.filter(owner=user)
        else:
            # 一覧に出るのは公開記事だけ（限定公開はURLを知っている人だけが見る）。
            queryset = Article.objects.filter(visibility=Article.VISIBILITY_PUBLIC)

        tag_slug = self.request.query_params.get("tag")
        if tag_slug:
            queryset = queryset.filter(tags__slug=tag_slug)

        # プロフィールの記事タブで使う。公開記事だけが対象なので、下書きは漏れない。
        author = self.request.query_params.get("author")
        if author:
            queryset = queryset.filter(owner__username=author)

        return queryset.select_related("owner").prefetch_related("tags").distinct()

    def perform_create(self, serializer):
        with transaction.atomic():
            article = serializer.save(owner=self.request.user)
            sync_citations(article)


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
        return (
            Article.objects.select_related("owner")
            .prefetch_related("tags", "citations__canonical_book")
        )

    def get_object(self):
        article = super().get_object()
        # 読むだけなら、公開・限定公開は誰でも見てよい。下書きは書いた人だけ。
        if self.request.method == "GET":
            is_owner = self.request.user.is_authenticated and article.owner_id == self.request.user.id
            if article.visibility == Article.VISIBILITY_PRIVATE and not is_owner:
                self.permission_denied(self.request, message="この記事は下書きです。")
        return article

    def check_object_permissions(self, request, obj):
        # GET は get_object 側で判定するので、書き手チェックは書き換え系だけに掛ける。
        if request.method != "GET":
            super().check_object_permissions(request, obj)

    def perform_update(self, serializer):
        with transaction.atomic():
            article = serializer.save()
            sync_citations(article)


class ArticleCitingListView(generics.ListAPIView):
    """
    GET /api/articles/citing/?book=<書のslug>&chapter=<章>&verse=<節>

    その節を引用している公開記事。節のページの「引用した記事」タブで使う。
    """

    serializer_class = ArticleListSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_queryset(self):
        params = self.request.query_params
        book_slug = params.get("book")
        chapter = params.get("chapter")
        verse = params.get("verse")
        if not book_slug or not chapter:
            return Article.objects.none()

        condition = Q(
            citations__canonical_book__slug=book_slug,
            citations__chapter_number=chapter,
        )
        if verse:
            # 節の指定があるときは、その節を含む引用（範囲引用も含む）と章まるごとの参照を拾う。
            condition &= Q(
                citations__verse_number_start__lte=verse,
                citations__verse_number_end__gte=verse,
            ) | Q(citations__verse_number_start__isnull=True)

        return (
            Article.objects.filter(condition, visibility=Article.VISIBILITY_PUBLIC)
            .select_related("owner")
            .prefetch_related("tags")
            .distinct()
        )


class ArticleTagListView(generics.ListAPIView):
    """
    GET /api/article-tags/   主題タグの一覧。記事が1件も無いタグは出さない。
    """

    serializer_class = ArticleTagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return (
            ArticleTag.objects.annotate(
                article_count=Count(
                    "articles",
                    filter=Q(articles__visibility=Article.VISIBILITY_PUBLIC),
                    distinct=True,
                )
            )
            .filter(article_count__gt=0)
            .order_by("name")
        )


class ArticleCommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/articles/{id}/comments/   記事へのコメント（記事全体に対してのみ付く）
    POST /api/articles/{id}/comments/   コメントする（要認証）
    """

    serializer_class = ArticleCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = None

    def get_article(self):
        article = get_object_or_404(_visible_articles(self.request.user), pk=self.kwargs["pk"])
        return article

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["article"] = self.get_article()
        return context

    def get_queryset(self):
        return (
            ArticleComment.objects.filter(article=self.get_article())
            .select_related("user")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, article=self.get_article())


class ArticleCommentDestroyView(generics.DestroyAPIView):
    """
    DELETE /api/article-comments/{id}/   自分のコメントを消す（論理削除。返信の親を保つため）
    """

    permission_classes = [permissions.IsAuthenticated]
    queryset = ArticleComment.objects.all()

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.user_id != request.user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        comment.is_deleted = True
        comment.save(update_fields=["is_deleted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
