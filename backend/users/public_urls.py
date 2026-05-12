from django.urls import path

from . import views

urlpatterns = [
    path("<str:username>/", views.UserProfileView.as_view()),
    path("<str:username>/comments/", views.UserCommentsView.as_view()),
    path("<str:username>/bookmarks/", views.UserBookmarksView.as_view()),
]
