"""一覧 API 用の共通ページネーション設定。

DRF の `DEFAULT_PAGINATION_CLASS` は設定せず、無制限取得が危険な ListAPIView
（コメント・通知・ブックマーク等）でだけ opt-in で適用する方針を取っている。
"""

from rest_framework.pagination import PageNumberPagination


class StandardPageNumberPagination(PageNumberPagination):
    """ページ番号方式の標準ページネーション。

    レスポンス形式: { "count", "next", "previous", "results": [...] }
    クライアントは `?page=2&page_size=50` のように指定できる。
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
