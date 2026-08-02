from django.db import models
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from bible.passage import location_filter
from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwner

from .models import Answer, Question
from .serializers import (
    AnswerEditSerializer,
    AnswerSerializer,
    QuestionEditSerializer,
    QuestionSerializer,
)


def _question_queryset():
    """一覧・詳細で共通の下ごしらえ。

    回答件数は「削除されていない回答」だけ数える（削除済みが件数に残ると、
    開いたときの見た目と数が合わない）。
    """
    return (
        Question.objects.filter(is_deleted=False)
        .select_related("user", "canonical_book", "best_answer__user")
        .prefetch_related("tags")
        .annotate(
            answer_count=Count(
                "answers", distinct=True, filter=models.Q(answers__is_deleted=False)
            )
        )
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
        qs = _question_queryset()
        params = self.request.query_params

        book_slug = params.get("book_slug")
        if book_slug:
            qs = qs.filter(
                **location_filter(
                    book_slug=book_slug,
                    chapter_number=params.get("chapter_number"),
                    verse_number=params.get("verse_number"),
                )
            )

        book_id = params.get("book_id")
        if book_id:
            # 訳ごとの Book id で届くので、訳非依存の書へ解決してから絞る。
            from bible.models import Book

            book_ids = [b for b in book_id.split(",") if b]
            canonical_ids = list(
                Book.objects.filter(id__in=book_ids).values_list("canonical_book_id", flat=True)
            )
            qs = qs.filter(canonical_book_id__in=canonical_ids)

        tag_id = params.get("tag_id")
        if tag_id:
            qs = qs.filter(tags__id=tag_id).distinct()

        q = (params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                models.Q(title__icontains=q)
                | models.Q(body__icontains=q)
                | models.Q(user__username__icontains=q)
                | models.Q(tags__name__icontains=q)
                | models.Q(canonical_book__slug__icontains=q)
            ).distinct()

        answered = params.get("answered")
        if answered == "true":
            qs = qs.filter(best_answer__isnull=False)
        elif answered == "false":
            qs = qs.filter(best_answer__isnull=True)

        return qs.order_by("-created_at")


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
        return _question_queryset()

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
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class AnswerListView(generics.ListAPIView):
    """GET /api/qa/questions/{question_pk}/answers/  回答一覧（認証不要、古い順）"""

    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPageNumberPagination
    serializer_class = AnswerSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # ベストアンサー判定を回答ごとに質問へ聞きに行かないよう、1回だけ引いて渡す。
        context["best_answer_id"] = (
            Question.objects.filter(pk=self.kwargs["question_pk"])
            .values_list("best_answer_id", flat=True)
            .first()
        )
        return context

    def get_queryset(self):
        return (
            Answer.objects.filter(question_id=self.kwargs["question_pk"])
            .select_related("user")
            .order_by("created_at")
        )


class AnswerCreateView(generics.CreateAPIView):
    """POST /api/qa/answers/  回答を投稿（要認証）"""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AnswerSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "comment_create"

    def perform_create(self, serializer):
        answer = serializer.save()
        # 質問した人に「回答が付いた」と知らせる。自分で自分の質問に答えたときは出さない。
        if answer.question.user != answer.user:
            from notifications.models import Notification

            Notification.objects.create(
                recipient=answer.question.user,
                actor=answer.user,
                notification_type="reply",
                answer=answer,
            )


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
        if answer.is_deleted:
            return Response(
                {"detail": "Cannot edit a deleted answer."}, status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(answer, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AnswerSerializer(answer, context=self.get_serializer_context()).data)

    def perform_destroy(self, instance: Answer) -> None:
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])
        # 削除された回答がベストアンサーのままだと「解決済み」の見た目だけ残る。
        if instance.best_answer_for.exists():
            Question.objects.filter(best_answer=instance).update(best_answer=None)


class _QAReportView(APIView):
    """質問・回答への通報。対象の種類だけが違うので共通の土台を持つ。

    自分の投稿は通報できない。同じ対象への重複通報は 409。
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "report"

    # 継承先で「対象のモデル」と「Report のどの列に入れるか」を決める。
    model = None
    report_field = ""

    def post(self, request, pk):
        from comments.models import Report
        from comments.serializers import ReportSerializer

        target = get_object_or_404(self.model, pk=pk)
        if target.user == request.user:
            return Response(
                {"detail": "Cannot report your own post."}, status=status.HTTP_400_BAD_REQUEST
            )
        serializer = ReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        _, created = Report.objects.get_or_create(
            reporter=request.user,
            **{self.report_field: target},
            defaults={"reason": serializer.validated_data["reason"]},
        )
        if not created:
            return Response({"detail": "Already reported."}, status=status.HTTP_409_CONFLICT)
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

    def patch(self, request, pk):
        question = get_object_or_404(Question, pk=pk, is_deleted=False)
        if question.user != request.user:
            return Response(
                {"detail": "Only the question author can set the best answer."},
                status=status.HTTP_403_FORBIDDEN,
            )
        answer_id = request.data.get("answer_id")
        if answer_id is None:
            question.best_answer = None
        else:
            question.best_answer = get_object_or_404(
                Answer, pk=answer_id, question=question, is_deleted=False
            )
        question.save(update_fields=["best_answer", "updated_at"])
        return Response(status=status.HTTP_200_OK)
