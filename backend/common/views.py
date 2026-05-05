from django.db import connection, OperationalError
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def healthz(request: Request) -> Response:
    """
    ヘルスチェックエンドポイント。
    DB に接続できる場合は 200、できない場合は 503 を返す。
    Better Stack などのアップタイム監視ツールがこのエンドポイントを定期的に叩く。
    """
    try:
        connection.ensure_connection()
        db_ok = True
    except OperationalError:
        db_ok = False

    status_str = "ok" if db_ok else "degraded"
    http_status = 200 if db_ok else 503

    return Response({"status": status_str, "db": db_ok}, status=http_status)


@ensure_csrf_cookie
@require_GET
def get_csrf_token(request):
    """
    csrftoken Cookie を設定するためのエンドポイント。
    フロントエンドはマウント時にこれを叩き、以降の書き込み系リクエストで
    X-CSRFToken ヘッダーを送信できるようにする。
    """
    return JsonResponse({"detail": "ok"})
