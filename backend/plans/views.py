from django.db import transaction
from django.db.models import Count, Max, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination

from .models import Plan, PlanDay, PlanDayProgress, PlanSubscription
from .serializers import (
    PlanDaySerializer,
    PlanDetailSerializer,
    PlanListSerializer,
    PlanSubscriptionSerializer,
    PlanWriteSerializer,
    check_day_limit,
)


class IsPlanOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        plan = obj if isinstance(obj, Plan) else obj.plan
        return plan.owner_id == request.user.id


def _get_owned_plan(request, plan_id: str) -> Plan:
    """書いた人だけが触れるプランを取り出す。他人なら 404（存在自体を伏せる）。"""
    return get_object_or_404(Plan, pk=plan_id, owner=request.user)


def _subscription_for(request, plan: Plan) -> PlanSubscription | None:
    if not request.user.is_authenticated:
        return None
    return PlanSubscription.objects.filter(user=request.user, plan=plan).first()


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
        user = self.request.user
        if self.request.query_params.get("mine") == "true" and user.is_authenticated:
            queryset = Plan.objects.filter(owner=user)
        else:
            queryset = Plan.objects.filter(visibility=Plan.VISIBILITY_PUBLIC)
        return (
            queryset.select_related("owner")
            .annotate(
                active_reader_count=Count(
                    "subscriptions",
                    filter=Q(subscriptions__is_active=True),
                )
            )
            .order_by("-created_at")
            .prefetch_related("days")
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
        return (
            Plan.objects.select_related("owner")
            .annotate(
                active_reader_count=Count(
                    "subscriptions",
                    filter=Q(subscriptions__is_active=True),
                )
            )
            .prefetch_related("days__readings__canonical_book")
        )

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
            plan = self.get_object()
            subscription = _subscription_for(self.request, plan)
            context["subscription"] = subscription
            context["completed_day_ids"] = (
                set(
                    PlanDayProgress.objects.filter(subscription=subscription).values_list(
                        "day_id", flat=True
                    )
                )
                if subscription
                else None
            )
        return context


class PlanDayCreateView(APIView):
    """
    POST /api/plans/{id}/days/   日を末尾に足す（書いた人だけ）

    足すのはいつでもできる。読んでいる人の進捗は「第N日」に紐づいているので、
    後ろに足すぶんには何もずれないため。
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        plan = _get_owned_plan(request, pk)
        check_day_limit(plan)
        with transaction.atomic():
            last = plan.days.aggregate(Max("number"))["number__max"] or 0
            day = PlanDay.objects.create(
                plan=plan,
                number=last + 1,
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
        return PlanDay.objects.filter(plan__owner=self.request.user).prefetch_related(
            "readings__canonical_book"
        )

    def get_object(self):
        return get_object_or_404(self.get_queryset(), pk=self.kwargs["day_id"], plan_id=self.kwargs["pk"])

    def destroy(self, request, *args, **kwargs):
        day = self.get_object()
        if day.plan.has_readers:
            return Response(
                {"detail": "読み始めた人がいるので、日は消せません。中身は直せます。"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            plan = day.plan
            day.delete()
            # 残った日の番号を詰める（1,2,3… の連番を保つ）。
            for index, remaining in enumerate(plan.days.order_by("number"), start=1):
                if remaining.number != index:
                    remaining.number = index
                    remaining.save(update_fields=["number", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanDayReorderView(APIView):
    """
    POST /api/plans/{id}/days/reorder/   日の並べ替え（読み始めた人がいたらできない）

    body: {"day_ids": ["...", "..."]} 並べたい順に全部の日のid
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        plan = _get_owned_plan(request, pk)
        if plan.has_readers:
            return Response(
                {"detail": "読み始めた人がいるので、日の並びは変えられません。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        day_ids = request.data.get("day_ids") or []
        days = {str(day.id): day for day in plan.days.all()}
        if set(day_ids) != set(days.keys()):
            return Response(
                {"detail": "すべての日を並べ替えの指定に入れてください。"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # 一意制約に引っかからないよう、いったん重ならない番号へ逃がしてから振り直す。
            for offset, day_id in enumerate(day_ids, start=1):
                day = days[day_id]
                day.number = offset + len(day_ids)
                day.save(update_fields=["number", "updated_at"])
            for index, day_id in enumerate(day_ids, start=1):
                day = days[day_id]
                day.number = index
                day.save(update_fields=["number", "updated_at"])

        return Response(status=status.HTTP_204_NO_CONTENT)


def _readable_plan(request, plan_id: str) -> Plan:
    """読んでよいプランを取り出す。下書きは書いた人だけ。"""
    visible = Q(visibility__in=[Plan.VISIBILITY_PUBLIC, Plan.VISIBILITY_UNLISTED])
    if request.user.is_authenticated:
        visible |= Q(owner=request.user)
    return get_object_or_404(Plan.objects.filter(visible), pk=plan_id)


class PlanSubscribeView(APIView):
    """
    POST   /api/plans/{id}/subscribe/   読み始める（やめていたら読み直す）
    DELETE /api/plans/{id}/subscribe/   やめる（読んだ記録は残す）
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        plan = _readable_plan(request, pk)
        subscription, created = PlanSubscription.objects.get_or_create(
            user=request.user, plan=plan
        )
        if not created and not subscription.is_active:
            subscription.is_active = True
            subscription.save(update_fields=["is_active", "updated_at"])
        return Response(
            PlanSubscriptionSerializer(subscription).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request, pk):
        subscription = get_object_or_404(PlanSubscription, user=request.user, plan_id=pk)
        subscription.is_active = False
        subscription.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class PlanRestartView(APIView):
    """
    POST /api/plans/{id}/restart/   最初からやり直す（読んだ記録を消して、今日から数え直す）
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        subscription = get_object_or_404(PlanSubscription, user=request.user, plan_id=pk)
        with transaction.atomic():
            subscription.progress.all().delete()
            subscription.is_active = True
            # started_at は auto_now_add なので、数え直すために作り直す。
            subscription.delete()
            subscription = PlanSubscription.objects.create(
                user=request.user, plan_id=pk, is_active=True
            )
        return Response(PlanSubscriptionSerializer(subscription).data)


class PlanDayCompleteView(APIView):
    """
    POST   /api/plans/{id}/days/{day_id}/complete/   その日を読み終えた印をつける
    DELETE /api/plans/{id}/days/{day_id}/complete/   印を外す
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, day_id):
        subscription = get_object_or_404(
            PlanSubscription,
            user=request.user,
            plan_id=pk,
            is_active=True,
        )
        day = get_object_or_404(PlanDay, pk=day_id, plan_id=pk)
        PlanDayProgress.objects.get_or_create(subscription=subscription, day=day)
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk, day_id):
        subscription = get_object_or_404(
            PlanSubscription,
            user=request.user,
            plan_id=pk,
            is_active=True,
        )
        PlanDayProgress.objects.filter(subscription=subscription, day_id=day_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MyPlanSubscriptionListView(generics.ListAPIView):
    """GET /api/plan-subscriptions/   自分が読んでいるプラン"""

    serializer_class = PlanSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return PlanSubscription.objects.filter(
            user=self.request.user, is_active=True
        ).select_related("plan")
