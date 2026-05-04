from django.urls import path

from . import views

urlpatterns = [
    path("bookmarks/", views.BookmarkListCreateView.as_view(), name="bookmark-list-create"),
    path("bookmarks/<uuid:pk>/", views.BookmarkDestroyView.as_view(), name="bookmark-destroy"),
]
