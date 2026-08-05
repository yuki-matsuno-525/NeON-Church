"""読書計画の HTTP 入口。

何が見えるかは selectors.py、日の増減・購読・進捗の規則は services.py。
"""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwnerOf
from common.schema import DetailSerializer

from . import selectors, services
from .models import Plan
from .serializers import (
    PlanDaySerializer,
    PlanDetailSerializer,
    PlanListSerializer,
    PlanSubscriptionSerializer,
    PlanWriteSerializer,
    check_day_limit,
)


class IsPlanOwner(IsOwnerOf):
    """計画を書いた人だけに許す。日（PlanDay）が渡ったら計画をたどる。"""

    parent_attr = "plan"


class PlanListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/plans/   プラン一覧。既定は公開のみ。?mine=true で自分の（下書き含む）
    POST /api/plans/   プランを作る（要認証）
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        return PlanWriteSerializer if self.request.method == "POST" else PlanListSerializer

    def get_queryset(self):
        return selectors.list_plans(
            self.request.user,
            mine=self.request.query_params.get("mine") == "true",
        )

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/plans/{id}/   プラン1件（日と章の中身つき）
    PATCH  /api/plans/{id}/   書き換え（書いた人だけ）
    DELETE /api/plans/{id}/   削除（書いた人だけ）
    """

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsPlanOwner]

    def get_serializer_class(self):
        return PlanDetailSerializer if self.request.method == "GET" else PlanWriteSerializer

    def get_queryset(self):
        return selectors.plans_with_days()

    def get_object(self):
        plan = super().get_object()
        if self.request.method == "GET":
            is_owner = self.request.user.is_authenticated and plan.owner_id == self.request.user.id
            if plan.visibility == Plan.VISIBILITY_PRIVATE and not is_owner:
                self.permission_denied(self.request, message="このプランは下書きです。")
        return plan

    def check_object_permissions(self, request, obj):
        if request.method != "GET":
            super().check_object_permissions(request, obj)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == "GET":
            subscription = selectors.subscription_for(self.request.user, self.get_object())
            context["subscription"] = subscription
            context["completed_day_ids"] = selectors.completed_day_ids(subscription)
        return context


class PlanDayCreateRequestSerializer(serializers.Serializer):
    """日を末尾に足すときの入力。どちらも省略できる（空で作って後から書ける）。"""

    title = serializers.CharField(required=False, allow_blank=True)
    devotional = serializers.CharField(required=False, allow_blank=True)


class PlanDayReorderRequestSerializer(serializers.Serializer):
    """並べ替えの入力。並べたい順に、その計画の全部の日の id を渡す。"""

    day_ids = serializers.ListField(child=serializers.UUIDField())


class PlanDayCreateView(APIView):
    """
    POST /api/plans/{id}/days/   日を末尾に足す（書いた人だけ）

    足すのはいつでもできる。読んでいる人の進捗は「第N日」に紐づいているので、
    後ろに足すぶんには何もずれないため。
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=PlanDayCreateRequestSerializer,
        responses={201: PlanDaySerializer, 400: DetailSerializer},
    )
    def post(self, request, pk):
        plan = services.get_owned_plan(request.user, pk)
        check_day_limit(plan)
        day = services.append_day(
            plan,
            title=request.data.get("title", ""),
            devotional=request.data.get("devotional", ""),
        )
        return Response(PlanDaySerializer(day).data, status=status.HTTP_201_CREATED)


class PlanDayDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    PATCH  /api/plans/{id}/days/{day_id}/   その日の題・文章・読む章を書き換える
    DELETE /api/plans/{id}/days/{day_id}/   その日を消す（誰かが読み始めていたら消せない）

    中身の書き換えは、読み始めた人がいてもできる。読んだ記録は「第N日」に紐づくので、
    中身が変わっても記録は壊れないため。誤りを直せないほうが困る。
    """

    serializer_class = PlanDaySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return selectors.owned_days(self.request.user)

    def get_object(self):
        return get_object_or_404(
            self.get_queryset(), pk=self.kwargs["day_id"], plan_id=self.kwargs["pk"]
        )

    def destroy(self, request, *args, **kwargs):
        services.delete_day(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanDayReorderView(APIView):
    """
    POST /api/plans/{id}/days/reorder/   日の並べ替え（読み始めた人がいたらできない）

    body: {"day_ids": ["...", "..."]} 並べたい順に全部の日のid
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=PlanDayReorderRequestSerializer,
        responses={204: None, 400: DetailSerializer},
    )
    def post(self, request, pk):
        plan = services.get_owned_plan(request.user, pk)
        services.reorder_days(plan, request.data.get("day_ids") or [])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanSubscribeView(APIView):
    """
    POST   /api/plans/{id}/subscribe/   読み始める（やめていたら読み直す）
    DELETE /api/plans/{id}/subscribe/   やめる（読んだ記録は残す）
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: PlanSubscriptionSerializer, 201: PlanSubscriptionSerializer},
    )
    def post(self, request, pk):
        plan = services.readable_plan(request.user, pk)
        subscription, created = services.subscribe(request.user, plan)
        return Response(
            PlanSubscriptionSerializer(subscription).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @extend_schema(responses={204: None})
    def delete(self, request, pk):
        services.unsubscribe(request.user, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanRestartView(APIView):
    """
    POST /api/plans/{id}/restart/   最初からやり直す（読んだ記録を消して、今日から数え直す）
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: PlanSubscriptionSerializer})
    def post(self, request, pk):
        subscription = services.restart(request.user, pk)
        return Response(PlanSubscriptionSerializer(subscription).data)


class PlanDayCompleteView(APIView):
    """
    POST   /api/plans/{id}/days/{day_id}/complete/   その日を読み終えた印をつける
    DELETE /api/plans/{id}/days/{day_id}/complete/   印を外す
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={201: None})
    def post(self, request, pk, day_id):
        services.mark_day_complete(request.user, pk, day_id)
        return Response(status=status.HTTP_201_CREATED)

    @extend_schema(responses={204: None})
    def delete(self, request, pk, day_id):
        services.unmark_day_complete(request.user, pk, day_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyPlanSubscriptionListView(generics.ListAPIView):
    """GET /api/plan-subscriptions/   自分が読んでいるプラン"""

    serializer_class = PlanSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return selectors.active_subscriptions(self.request.user)
