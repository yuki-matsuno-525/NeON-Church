"""お気に入りの HTTP 入口。

何が見えるかは selectors.py、対象と重複の規則は services.py。
"""

from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from common.pagination import StandardPageNumberPagination
from common.permissions import IsOwner

from . import selectors, services
from .filters import count_by_type, filter_by_location, filter_by_type
from .serializers import BookmarkSerializer


class BookmarkListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/bookmarks/         自分のお気に入り一覧（要認証）
    GET  /api/bookmarks/?type=verse  種類で絞り込み（verse/chapter/book/comment/project）
    POST /api/bookmarks/         お気に入り追加（重複は 409）

    一覧レスポンスには通常の count/next/results に加えて counts を付ける。
    counts は絞り込み前の全種類の件数で、画面のタブに出す数字に使う。

    読書画面向けに箇所での絞り込みも受ける（`filters.filter_by_location` を参照）。
    GET /api/bookmarks/?book=<書のslug>              その書に付いたお気に入り
    GET /api/bookmarks/?book=<書のslug>&chapter=<章> その章と、その章の節に付いたお気に入り・コメントのお気に入り
    GET /api/bookmarks/?translation_project=<id>     その翻訳企画のお気に入り
    箇所で絞ったときは counts を付けない（画面のタブに使わないため、集計の往復を省く）。
    """

    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPageNumberPagination

    def get_base_queryset(self):
        return selectors.own_bookmarks(self.request.user)

    def _location_params(self):
        """箇所での絞り込みの指定を取り出す。1つも指定が無ければ None を返す。"""
        params = self.request.query_params
        book_slug = params.get("book")
        project_id = params.get("translation_project")
        if not book_slug and not project_id:
            return None
        chapter = params.get("chapter")
        chapter_number = int(chapter) if chapter and chapter.isdigit() else None
        return book_slug, chapter_number, project_id

    def get_queryset(self):
        qs = self.get_base_queryset().select_related(*selectors.LIST_RELATED)
        location = self._location_params()
        if location:
            qs = filter_by_location(qs, *location)
        else:
            qs = filter_by_type(qs, self.request.query_params.get("type"))
        return selectors.annotate_verse_text(qs)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # 箇所で絞ったときはタブを出さないので、件数集計の1往復を省く。
        if self._location_params() is None:
            response.data["counts"] = count_by_type(self.get_base_queryset())
        return response

    def perform_create(self, serializer):
        user = self.request.user
        # verse/chapter/book は箇所を引くための入力で、保存はしない。
        # ここで箇所へ変換し、キー自体は取り除く。
        verse = serializer.validated_data.pop("verse", None)
        chapter = serializer.validated_data.pop("chapter", None)
        book = serializer.validated_data.pop("book", None)
        comment = serializer.validated_data.get("comment")
        project = serializer.validated_data.get("translation_project")

        if not any([verse, chapter, book, comment, project]):
            raise ValidationError(
                {"detail": "Specify a verse, chapter, book, comment or project to favorite."}
            )

        services.check_target_visible(user, comment=comment, project=project)
        location = services.derive_location(verse=verse, chapter=chapter, book=book)
        services.check_not_duplicated(user, location=location, comment=comment, project=project)
        with transaction.atomic():
            serializer.save(user=user, **location)

    def create(self, request, *args, **kwargs):
        services.resolve_visible_targets(request.user, request.data)
        try:
            return super().create(request, *args, **kwargs)
        except ValidationError as exc:
            # 重複は「入力が不正」ではなく「もう入っている」なので 409 で返す。
            return Response(exc.detail, status=status.HTTP_409_CONFLICT)


class BookmarkDestroyView(generics.DestroyAPIView):
    """
    DELETE /api/bookmarks/{pk}/  お気に入り削除（自分のもののみ）
    """

    # 削除は本文を返さないので実行時には使われないが、スキーマ生成が
    # 対象の型を決められるように置いておく。
    serializer_class = BookmarkSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return selectors.deletable_bookmarks(self.request.user)
