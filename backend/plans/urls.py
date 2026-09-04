from django.urls import path

from . import views

urlpatterns = [
    path("plans/", views.PlanListCreateView.as_view(), name="plan-list-create"),
    path("plans/<uuid:pk>/", views.PlanDetailView.as_view(), name="plan-detail"),
    path("plans/<uuid:pk>/days/", views.PlanDayCreateView.as_view(), name="plan-day-create"),
    # 固定の文字列は <uuid:day_id> より前に置く。
    path(
        "plans/<uuid:pk>/days/reorder/",
        views.PlanDayReorderView.as_view(),
        name="plan-day-reorder",
    ),
    path(
        "plans/<uuid:pk>/days/<uuid:day_id>/",
        views.PlanDayDetailView.as_view(),
        name="plan-day-detail",
    ),
    path(
        "plans/<uuid:pk>/readings/<uuid:reading_id>/complete/",
        views.PlanReadingCompleteView.as_view(),
        name="plan-reading-complete",
    ),
    path("plans/<uuid:pk>/subscribe/", views.PlanSubscribeView.as_view(), name="plan-subscribe"),
    path("plans/<uuid:pk>/restart/", views.PlanRestartView.as_view(), name="plan-restart"),
    path(
        "plan-subscriptions/",
        views.MyPlanSubscriptionListView.as_view(),
        name="plan-subscription-list",
    ),
]
