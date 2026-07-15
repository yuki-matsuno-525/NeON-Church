from django.urls import path

from . import views

urlpatterns = [
    path("motifs/", views.MotifTagListCreateView.as_view(), name="motif-list-create"),
    path("motifs/<slug:slug>/", views.MotifTagDetailView.as_view(), name="motif-detail"),
    path("compilations/", views.CompiledBookListCreateView.as_view(), name="compiled-book-list-create"),
    path("compilations/<uuid:book_id>/", views.CompiledBookDetailView.as_view(), name="compiled-book-detail"),
    path("compilations/<uuid:book_id>/publish/", views.CompiledBookPublishView.as_view(), name="compiled-book-publish"),
    path("compilations/<uuid:book_id>/unpublish/", views.CompiledBookUnpublishView.as_view(), name="compiled-book-unpublish"),
    path("compilations/<uuid:book_id>/chapters/", views.CompiledChapterListCreateView.as_view(), name="compiled-chapter-list-create"),
    path("compilations/<uuid:book_id>/chapters/<uuid:chapter_id>/", views.CompiledChapterDetailView.as_view(), name="compiled-chapter-detail"),
    path("compilations/<uuid:book_id>/verses/", views.CompiledVerseListCreateView.as_view(), name="compiled-verse-list-create"),
    path("compilations/<uuid:book_id>/verses/<uuid:verse_id>/", views.CompiledVerseDetailView.as_view(), name="compiled-verse-detail"),
    path("compilations/comments/", views.CompiledCommentListCreateView.as_view(), name="compiled-comment-list-create"),
    path("compilations/comments/<uuid:comment_id>/", views.CompiledCommentDeleteView.as_view(), name="compiled-comment-delete"),
]
