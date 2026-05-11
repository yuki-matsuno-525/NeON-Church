from django.urls import path

from . import views

urlpatterns = [
    path("tags/", views.TagListView.as_view(), name="tag-list"),
    path("comments/mine/", views.MyCommentListView.as_view(), name="comment-mine"),
    path("comments/qa/", views.QACommentListView.as_view(), name="comment-qa"),
    path("comments/", views.CommentListCreateView.as_view(), name="comment-list-create"),
    path("comments/<uuid:pk>/", views.CommentUpdateDestroyView.as_view(), name="comment-update-destroy"),
    path("comments/<uuid:pk>/upvote/", views.CommentUpvoteView.as_view(), name="comment-upvote"),
    path("comments/<uuid:pk>/report/", views.ReportView.as_view(), name="comment-report"),
    path("comments/<uuid:pk>/moderate/", views.AdminCommentModerateView.as_view(), name="comment-moderate"),
]
