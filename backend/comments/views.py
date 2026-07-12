from django.db import models
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwner
from .models import Comment, Report, Tag, Vote
from .serializers import CommentSerializer, ReportSerializer, TagSerializer


def _location_from_target(*, verse_id=None, chapter_id=None, book_id=None):
    """旧ターゲット id（verse/chapter/book のいずれか）を箇所列フィルタへ解決する。

    段階6D: コメントを訳横断の箇所で集約取得するために使う。存在しない id は None を返す。
    返り値は Comment.objects.filter(**loc) に渡せる dict。
    """
    from bible.models import Book, Chapter, Verse

    if verse_id:
        v = Verse.objects.filter(id=verse_id).select_related("chapter__book").first()
        if not v:
            return None
        return {
            "canonical_book_id": v.chapter.book.canonical_book_id,
            "chapter_number": v.chapter.number,
            "verse_number": v.number,
        }
    if chapter_id:
        ch = Chapter.objects.filter(id=chapter_id).select_related("book").first()
        if not ch:
            return None
        return {
            "canonical_book_id": ch.book.canonical_book_id,
            "chapter_number": ch.number,
            "verse_number__isnull": True,
        }
    if book_id:
        b = Book.objects.filter(id=book_id).first()
        if not b:
            return None
        return {
            "canonical_book_id": b.canonical_book_id,
            "chapter_number__isnull": True,
            "verse_number__isnull": True,
        }
    return None


def _notify(recipient, actor, notification_type, comment):
    """通知を作成するヘルパー。自己通知はスキップ。"""
    if recipient == actor:
        return
    from notifications.models import Notification
    Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        comment=comment,
    )


class CommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/comments/?verse_id=&ordering=new|votes  コメント一覧
    POST /api/comments/                                コメント投稿（要認証）

    verse_id / chapter_id / book_id のいずれかが必須。
    指定なしの場合は空リストを返す。
    """

    serializer_class = CommentSerializer
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

    def perform_create(self, serializer):
        comment = serializer.save()
        if comment.parent:
            _notify(
                recipient=comment.parent.user,
                actor=comment.user,
                notification_type="reply",
                comment=comment,
            )

    def get_queryset(self):
        qs = (
            Comment.objects.select_related(
                "user", "translation_project", "canonical_book"
            )
            .prefetch_related("tags")
            .annotate(vote_count=Count("votes"))
        )
        params = self.request.query_params

        verse_id = params.get("verse_id")
        chapter_id = params.get("chapter_id")
        book_id = params.get("book_id")
        parent_id = params.get("parent_id")

        # 段階6D/6F: 箇所での取得。訳非依存の箇所列で絞るため、同じ箇所へのコメントは訳をまたいで
        # 1スレッドに集約される。book_slug(+章+節) で直接指定するか、旧 verse_id/chapter_id/book_id を
        # その id が指す箇所へ解決して絞る。粒度は指定の細かさで一意（book=書 / +章=章 / +章+節=節）。
        book_slug = params.get("book_slug")
        chapter_number = params.get("chapter_number")
        verse_number = params.get("verse_number")

        if book_slug:
            qs = qs.filter(canonical_book__slug=book_slug)
            if verse_number:
                qs = qs.filter(chapter_number=chapter_number, verse_number=verse_number)
            elif chapter_number:
                qs = qs.filter(chapter_number=chapter_number, verse_number__isnull=True)
            else:
                qs = qs.filter(chapter_number__isnull=True, verse_number__isnull=True)
        elif verse_id or chapter_id or book_id:
            loc = _location_from_target(verse_id=verse_id, chapter_id=chapter_id, book_id=book_id)
            if loc is None:
                return qs.none()
            qs = qs.filter(**loc)
        elif parent_id:
            qs = qs.filter(parent_id=parent_id)
        else:
            return qs.none()

        # スコープ（翻訳プロジェクト／聖書本体）で分離する。混ぜない（訳横断集約は箇所で行い、
        # 本体コメントと特定PJコメントは別スレッド）。translation_project 指定でその PJ 専用、
        # 未指定で聖書本体（translation_project IS NULL）。
        translation_project = params.get("translation_project")
        if translation_project:
            qs = qs.filter(translation_project_id=translation_project)
        else:
            qs = qs.filter(translation_project__isnull=True)

        tag_id = params.get("tag_id")
        if tag_id:
            # M2M JOIN による重複行を防ぐため distinct() を末尾に付ける
            qs = qs.filter(tags__id=tag_id).distinct()

        ordering = params.get("ordering", "new")
        if ordering == "votes":
            qs = qs.order_by("-vote_count", "-created_at")
        else:
            qs = qs.order_by("-created_at")

        return qs


class CommentUpvoteView(APIView):
    """
    POST   /api/comments/{pk}/upvote/  upvote 追加（要認証、二重投票は 409）
    DELETE /api/comments/{pk}/upvote/  upvote 取り消し（未投票の場合は 404）
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        _, created = Vote.objects.get_or_create(user=request.user, comment=comment)
        if not created:
            return Response({"detail": "Already voted."}, status=status.HTTP_409_CONFLICT)
        _notify(
            recipient=comment.user,
            actor=request.user,
            notification_type="upvote",
            comment=comment,
        )
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        deleted_count, _ = Vote.objects.filter(user=request.user, comment=comment).delete()
        if not deleted_count:
            return Response({"detail": "Vote not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CommentUpdateDestroyView(generics.UpdateAPIView, generics.DestroyAPIView):
    """
    PATCH  /api/comments/{pk}/  body の編集（自分のコメントのみ、削除済みは不可）
    DELETE /api/comments/{pk}/  論理削除（自分のコメントのみ）

    物理削除は行わず is_deleted=True をセットする。
    """

    permission_classes = [permissions.IsAuthenticated, IsOwner]
    queryset = Comment.objects.all()
    http_method_names = ["patch", "delete", "head", "options"]

    def get_serializer(self, *args, **kwargs):
        from .serializers import CommentEditSerializer
        kwargs.setdefault("context", self.get_serializer_context())
        return CommentEditSerializer(*args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_deleted:
            return Response({"detail": "Cannot edit a deleted comment."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        from .serializers import CommentSerializer
        return Response(CommentSerializer(instance).data)

    def perform_destroy(self, instance: Comment) -> None:
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TagListView(generics.ListAPIView):
    """GET /api/tags/  タグ一覧（認証不要）"""

    permission_classes = [permissions.AllowAny]
    queryset = Tag.objects.all().order_by("name")
    serializer_class = TagSerializer


class MyCommentListView(generics.ListAPIView):
    """GET /api/comments/mine/  ログインユーザー自身のコメント一覧（削除済み除く、新着順）"""

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        from .serializers import MyCommentSerializer
        return MyCommentSerializer

    def get_queryset(self):
        return (
            Comment.objects.filter(user=self.request.user, is_deleted=False, translation_project__isnull=True)
            .select_related("canonical_book")
            .annotate(vote_count=Count("votes"))
            .order_by("-created_at")
        )


class QACommentListView(generics.ListAPIView):
    """GET /api/comments/qa/  Q&Aフラグ付きコメント一覧（認証不要）

    ?book_id=   書で絞り込み（カンマ区切りで複数指定可。同一書の複数訳をまとめて絞る用）
    ?tag_id=    タグで絞り込み
    """

    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPageNumberPagination

    def get_serializer_class(self):
        from .serializers import QACommentSerializer
        return QACommentSerializer

    def get_queryset(self):
        qs = (
            Comment.objects.filter(is_qa=True, is_deleted=False, parent=None, translation_project__isnull=True)
            .select_related(
                "user",
                "canonical_book",
                "best_answer__user",
            )
            .prefetch_related("tags")
            .annotate(
                vote_count=Count("votes", distinct=True),
                reply_count=Count(
                    "replies",
                    distinct=True,
                    filter=models.Q(replies__is_deleted=False),
                ),
            )
            .order_by("-created_at")
        )
        params = self.request.query_params
        book_id = params.get("book_id")
        tag_id = params.get("tag_id")
        if book_id:
            # カンマ区切りで複数の Book id を受け付ける（同一書の複数訳をまとめて絞る）。
            # 段階6F: 各コメントは canonical_book で保持するので、Book id を canonical へ解決して絞る。
            book_ids = [b for b in book_id.split(",") if b]
            from bible.models import Book
            canonical_ids = list(
                Book.objects.filter(id__in=book_ids).values_list("canonical_book_id", flat=True)
            )
            qs = qs.filter(canonical_book_id__in=canonical_ids)
        if tag_id:
            qs = qs.filter(tags__id=tag_id).distinct()
        answered = params.get("answered")
        if answered == "true":
            qs = qs.filter(best_answer__isnull=False)
        elif answered == "false":
            qs = qs.filter(best_answer__isnull=True)
        return qs


class TrendingCommentView(generics.ListAPIView):
    """GET /api/comments/trending/  トレンドコメント（vote数順トップ5、認証不要）"""

    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        from .serializers import QACommentSerializer
        return QACommentSerializer

    def get_queryset(self):
        return (
            Comment.objects.filter(is_deleted=False, parent=None, translation_project__isnull=True)
            .select_related(
                "user",
                "canonical_book",
                "best_answer__user",
            )
            .prefetch_related("tags")
            .annotate(
                vote_count=Count("votes", distinct=True),
                reply_count=Count(
                    "replies",
                    distinct=True,
                    filter=models.Q(replies__is_deleted=False),
                ),
            )
            .order_by("-vote_count", "-created_at")[:5]
        )


class SetBestAnswerView(APIView):
    """PATCH /api/comments/{pk}/best-answer/  ベストアンサーの設定・解除（質問投稿者のみ）

    body: { "answer_comment_id": "<uuid>" }  設定
    body: { "answer_comment_id": null }      解除
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        question = get_object_or_404(Comment, pk=pk, is_qa=True, parent=None)
        if question.user != request.user:
            return Response(
                {"detail": "Only the question author can set the best answer."},
                status=status.HTTP_403_FORBIDDEN,
            )
        answer_id = request.data.get("answer_comment_id")
        if answer_id is None:
            question.best_answer = None
        else:
            answer = get_object_or_404(Comment, pk=answer_id, parent=question, is_deleted=False)
            question.best_answer = answer
        question.save(update_fields=["best_answer", "updated_at"])
        return Response(status=status.HTTP_200_OK)


class ReportView(APIView):
    """
    POST /api/comments/{pk}/report/  通報（要認証、同一コメントへの重複通報は 409）
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "report"

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if comment.user == request.user:
            return Response({"detail": "Cannot report your own comment."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        _, created = Report.objects.get_or_create(
            reporter=request.user,
            comment=comment,
            defaults={"reason": serializer.validated_data["reason"]},
        )
        if not created:
            return Response({"detail": "Already reported."}, status=status.HTTP_409_CONFLICT)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminCommentModerateView(APIView):
    """
    DELETE /api/comments/{pk}/moderate/  管理者による強制論理削除
    管理者（is_staff=True）のみ利用可能。所有者チェックなし。
    """

    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if not comment.is_deleted:
            comment.is_deleted = True
            comment.save(update_fields=["is_deleted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
