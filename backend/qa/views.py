"""Q&A の HTTP 入口。

絞り込みは selectors.py、通報・ベストアンサーの規則は services.py。
"""

from django.db import models
from drf_spectacular.utils import extend_schema
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from comments.serializers import ReportSerializer
from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwner
from common.schema import DetailSerializer

from . import selectors, services
from .models import Answer, Question
from .serializers import (
    AnswerEditSerializer,
    AnswerSerializer,
    QuestionEditSerializer,
    QuestionSerializer,
)


class QuestionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/qa/questions/  質問一覧（認証不要）
    POST /api/qa/questions/  質問を投稿（要認証）

    絞り込み:
      ?book_id=      書で絞る。カンマ区切りで複数可（同一書の複数訳をまとめて絞る用）
      ?book_slug=    訳非依存の書 slug で絞る。?chapter_number= ?verse_number= と併せて
                     箇所を指定できる（読書ページの Q&A タブが使う）
      ?tag_id=       タグで絞る
      ?q=            題・本文・投稿者・タグ・書 slug を横断して探す
      ?answered=     true=解決済み / false=未解決
    """

    serializer_class = QuestionSerializer
    pagination_class = StandardPageNumberPagination
    throttle_scope = "comment_create"

    def get_throttles(self):
        if self.request.method == "POST":
            return [ScopedRateThrottle()]
        return super().get_throttles()

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return selectors.list_questions(self.request.query_params)


class QuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/qa/questions/{pk}/  質問1件（認証不要）
    PATCH  /api/qa/questions/{pk}/  題・本文の編集（本人のみ）
    DELETE /api/qa/questions/{pk}/  論理削除（本人のみ）
    """

    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), IsOwner()]

    def get_queryset(self):
        return selectors.questions()

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return QuestionEditSerializer
        return QuestionSerializer

    def update(self, request, *args, **kwargs):
        question = self.get_object()
        serializer = self.get_serializer(question, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # 編集フォームを閉じたあとの表示に使えるよう、一覧と同じ形で返す。
        return Response(QuestionSerializer(self.get_object()).data)

    def perform_destroy(self, instance: Question) -> None:
        services.soft_delete(instance)


class AnswerListView(generics.ListAPIView):
    """GET /api/qa/questions/{question_pk}/answers/  回答一覧（認証不要、古い順）"""

    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPageNumberPagination
    serializer_class = AnswerSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # ベストアンサー判定を回答ごとに質問へ聞きに行かないよう、1回だけ引いて渡す。
        context["best_answer_id"] = selectors.best_answer_id(self.kwargs["question_pk"])
        return context

    def get_queryset(self):
        return selectors.question_answers(self.kwargs["question_pk"])


class AnswerCreateView(generics.CreateAPIView):
    """POST /api/qa/answers/  回答を投稿（要認証）"""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AnswerSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "comment_create"

    def perform_create(self, serializer):
        services.notify_question_author(serializer.save())


class AnswerDetailView(generics.UpdateAPIView, generics.DestroyAPIView):
    """
    PATCH  /api/qa/answers/{pk}/  本文の編集（本人のみ、削除済みは不可）
    DELETE /api/qa/answers/{pk}/  論理削除（本人のみ）
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = Answer.objects.all()
    serializer_class = AnswerEditSerializer
    http_method_names = ["patch", "delete", "head", "options"]

    def partial_update(self, request, *args, **kwargs):
        answer = self.get_object()
        services.ensure_editable(answer)
        serializer = self.get_serializer(answer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AnswerSerializer(answer, context=self.get_serializer_context()).data)

    def perform_destroy(self, instance: Answer) -> None:
        services.soft_delete_answer(instance)


class BestAnswerRequestSerializer(serializers.Serializer):
    """ベストアンサーの設定・解除。null を渡すと解除。"""

    answer_id = serializers.UUIDField(allow_null=True)


class _QAReportView(APIView):
    """質問・回答への通報。対象の種類だけが違うので共通の土台を持つ。

    自分の投稿は通報できない。同じ対象への重複通報は 409。
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "report"

    # 継承先で「対象のモデル」と「Report のどの列に入れるか」を決める。
    model: type[models.Model] | None = None
    report_field = ""

    @extend_schema(
        request=ReportSerializer,
        responses={201: ReportSerializer, 400: DetailSerializer, 409: DetailSerializer},
    )
    def post(self, request, pk):
        serializer = ReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.report(
            request.user,
            self.model,
            pk,
            self.report_field,
            serializer.validated_data["reason"],
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class QuestionReportView(_QAReportView):
    """POST /api/qa/questions/{pk}/report/  質問を通報（要認証）"""

    model = Question
    report_field = "question"


class AnswerReportView(_QAReportView):
    """POST /api/qa/answers/{pk}/report/  回答を通報（要認証）"""

    model = Answer
    report_field = "answer"


class SetBestAnswerView(APIView):
    """PATCH /api/qa/questions/{pk}/best-answer/  ベストアンサーの設定・解除（質問者のみ）

    body: { "answer_id": "<uuid>" }  設定
    body: { "answer_id": null }      解除
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=BestAnswerRequestSerializer,
        responses={200: None, 403: DetailSerializer},
    )
    def patch(self, request, pk):
        services.set_best_answer(request.user, pk, request.data.get("answer_id"))
        return Response(status=status.HTTP_200_OK)
