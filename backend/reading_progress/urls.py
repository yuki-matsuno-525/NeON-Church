from django.urls import path

from . import views

urlpatterns = [
    path("reading-progress/", views.ReadingProgressListView.as_view(), name="reading-progress-list"),
    path("reading-progress/save/", views.ReadingProgressSaveView.as_view(), name="reading-progress-save"),
]
