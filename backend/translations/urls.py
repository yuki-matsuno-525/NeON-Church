from django.urls import path
from . import views

urlpatterns = [
    path("translations/", views.TranslationProjectListCreateView.as_view(), name="translation-list"),
    path("translations/<uuid:project_id>/", views.TranslationProjectDetailView.as_view(), name="translation-detail"),
    path("translations/<uuid:project_id>/activate/", views.TranslationActivateView.as_view(), name="translation-activate"),
    path("translations/<uuid:project_id>/publish/", views.TranslationPublishView.as_view(), name="translation-publish"),
    path("translations/<uuid:project_id>/unpublish/", views.TranslationUnpublishView.as_view(), name="translation-unpublish"),
    path("translations/<uuid:project_id>/join/", views.TranslationJoinView.as_view(), name="translation-join"),
    path("translations/<uuid:project_id>/members/", views.TranslationMemberListView.as_view(), name="translation-members"),
    path("translations/<uuid:project_id>/members/<uuid:membership_id>/", views.TranslationMemberDetailView.as_view(), name="translation-member-detail"),
    path("translations/<uuid:project_id>/units/", views.TranslationUnitListCreateView.as_view(), name="translation-units"),
    path("translations/<uuid:project_id>/units/<uuid:unit_id>/", views.TranslationUnitDetailView.as_view(), name="translation-unit-detail"),
    path("translations/<uuid:project_id>/units/<uuid:unit_id>/assign/", views.TranslationUnitAssignView.as_view(), name="translation-unit-assign"),
    path("translations/<uuid:project_id>/units/<uuid:unit_id>/comments/", views.TranslationCommentListCreateView.as_view(), name="translation-unit-comments"),
    path("translations/<uuid:project_id>/comments/", views.TranslationCommentListCreateView.as_view(), name="translation-comments"),
    path("translations/<uuid:project_id>/comments/<uuid:comment_id>/", views.TranslationCommentDeleteView.as_view(), name="translation-comment-delete"),
    path("translations/<uuid:project_id>/add-book/", views.TranslationAddBookView.as_view(), name="translation-add-book"),
    path("translations/<uuid:project_id>/remove-book/", views.TranslationRemoveBookView.as_view(), name="translation-remove-book"),
    path("translations/<uuid:project_id>/read/", views.TranslationReadView.as_view(), name="translation-read"),
]
