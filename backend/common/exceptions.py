"""サービス層から投げる例外。

サービス層（services.py）はビューの外にあるので `Response` を返せない。
代わりにここの例外を投げ、DRF の例外ハンドラに HTTP へ翻訳させる。

DRF の既定ハンドラは、detail が文字列なら `{"detail": "..."}` の形に包む。
つまり `raise BadRequest("...")` は、ビューが
`Response({"detail": "..."}, status=400)` と書いていたのと同じ本文になる。
サービス層へ移すときにレスポンスの形が変わらないのはこのため。

`PermissionDenied`（403）と `NotFound`（404）は DRF に同じ挙動のものがあるので
そのまま使う。ここに足すのは DRF に無いものだけ。
"""

from rest_framework import status
from rest_framework.exceptions import APIException


class BadRequest(APIException):
    """入力が業務ルールに反する（400）。

    シリアライザの検証で表せない規則——「募集中でない企画には申し込めない」
    のような、他の行の状態に依存する規則——に使う。
    """

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid request."


class Conflict(APIException):
    """すでにその状態になっている（409）。二重投票・重複通報など。"""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Already exists."
