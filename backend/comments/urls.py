from django.urls import path

from . import views

urlpatterns = [
    path("comments/", views.CommentListCreateView.as_view(), name="comment-list-create"),
    path("comments/<uuid:pk>/", views.CommentDestroyView.as_view(), name="comment-destroy"),
    path("comments/<uuid:pk>/upvote/", views.CommentUpvoteView.as_view(), name="comment-upvote"),
    path("comments/<uuid:pk>/report/", views.ReportView.as_view(), name="comment-report"),
    path("comments/<uuid:pk>/moderate/", views.AdminCommentModerateView.as_view(), name="comment-moderate"),
]
