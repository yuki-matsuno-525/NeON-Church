from django.urls import path

from . import views

urlpatterns = [
    path("comments/", views.CommentListCreateView.as_view(), name="comment-list-create"),
    path("comments/<uuid:pk>/", views.CommentDestroyView.as_view(), name="comment-destroy"),
    path("comments/<uuid:pk>/upvote/", views.CommentUpvoteView.as_view(), name="comment-upvote"),
]
