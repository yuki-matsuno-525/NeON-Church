from django.urls import path

from . import views

urlpatterns = [
    path("tags/", views.TagListView.as_view(), name="tag-list"),
]
