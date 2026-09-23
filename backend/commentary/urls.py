from django.urls import path

from . import views

urlpatterns = [
    path("works/", views.WorkListView.as_view(), name="commentary-work-list"),
    path("works/<slug:slug>/", views.WorkDetailView.as_view(), name="commentary-work-detail"),
    path(
        "works/<slug:slug>/chapters/<int:number>/",
        views.ChapterDetailView.as_view(),
        name="commentary-chapter-detail",
    ),
    path(
        "works/<slug:slug>/chapters/<int:number>/sections/",
        views.ChapterSectionListView.as_view(),
        name="commentary-chapter-sections",
    ),
    path("passage/", views.PassageCommentaryListView.as_view(), name="commentary-passage"),
]
