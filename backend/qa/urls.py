from django.urls import path

from . import views

urlpatterns = [
    path("questions/", views.QuestionListCreateView.as_view(), name="qa-question-list-create"),
    path("questions/<uuid:pk>/", views.QuestionDetailView.as_view(), name="qa-question-detail"),
    path(
        "questions/<uuid:question_pk>/answers/",
        views.AnswerListView.as_view(),
        name="qa-answer-list",
    ),
    path(
        "questions/<uuid:pk>/best-answer/",
        views.SetBestAnswerView.as_view(),
        name="qa-best-answer",
    ),
    path(
        "questions/<uuid:pk>/report/",
        views.QuestionReportView.as_view(),
        name="qa-question-report",
    ),
    path("answers/", views.AnswerCreateView.as_view(), name="qa-answer-create"),
    path("answers/<uuid:pk>/", views.AnswerDetailView.as_view(), name="qa-answer-detail"),
    path("answers/<uuid:pk>/report/", views.AnswerReportView.as_view(), name="qa-answer-report"),
]
