from django.urls import path

from . import views

urlpatterns = [
    path("works/", views.WorkListView.as_view(), name="commentary-work-list"),
    path("works/<slug:slug>/", views.WorkDetailView.as_view(), name="commentary-work-detail"),
    path("works/<slug:slug>/sections/", views.WorkSectionListView.as_view(), name="commentary-work-sections"),
    path("passage/", views.PassageCommentaryListView.as_view(), name="commentary-passage"),
]
