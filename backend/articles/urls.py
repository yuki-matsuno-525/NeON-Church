from django.urls import path

from . import views

urlpatterns = [
    path("articles/", views.ArticleListCreateView.as_view(), name="article-list-create"),
    # 固定の文字列を先に置く（<uuid:pk> より前でないと citing が id として拾われる）。
    path("articles/citing/", views.ArticleCitingListView.as_view(), name="article-citing"),
    path("articles/<uuid:pk>/", views.ArticleDetailView.as_view(), name="article-detail"),
    path(
        "articles/<uuid:pk>/comments/",
        views.ArticleCommentListCreateView.as_view(),
        name="article-comment-list-create",
    ),
    path(
        "article-comments/<uuid:pk>/",
        views.ArticleCommentDestroyView.as_view(),
        name="article-comment-destroy",
    ),
    path("article-tags/", views.ArticleTagListView.as_view(), name="article-tag-list"),
]
