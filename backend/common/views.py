import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import OperationalError, connection
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle

from .schema import DetailSerializer

logger = logging.getLogger(__name__)


class FeedbackSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=("feedback", "bug", "feature", "privacy", "other"))
    email = serializers.EmailField(required=False, allow_blank=True, max_length=254)
    message = serializers.CharField(min_length=10, max_length=4000, trim_whitespace=True)
    page_url = serializers.URLField(required=False, allow_blank=True, max_length=500)
    # Hidden honeypot. Bots commonly fill every text field; humans never see this one.
    website = serializers.CharField(required=False, allow_blank=True, write_only=True)

    def validate_website(self, value: str) -> str:
        if value:
            raise serializers.ValidationError("Invalid submission.")
        return value


class FeedbackRateThrottle(SimpleRateThrottle):
    scope = "feedback"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class HealthSerializer(serializers.Serializer):
    """ヘルスチェックの応答。"""

    status = serializers.ChoiceField(choices=("ok", "degraded"))
    db = serializers.BooleanField()


@extend_schema(
    request=FeedbackSerializer,
    responses={
        201: DetailSerializer,
        503: DetailSerializer,
    },
)
@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([FeedbackRateThrottle])
def feedback(request: Request) -> Response:
    """Accept feedback without requiring a GitHub account or signed-in session."""

    serializer = FeedbackSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data
    sender = data.get("email") or "not provided"
    page_url = data.get("page_url") or "not provided"
    body = (
        f"Category: {data['category']}\nReply-to: {sender}\nPage: {page_url}\n\n{data['message']}"
    )
    try:
        send_mail(
            subject=f"[NeON Church feedback] {data['category']}",
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.FEEDBACK_EMAIL],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Feedback email delivery failed")
        return Response(
            {"detail": "Feedback could not be sent. Please try again later."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response({"detail": "Feedback received."}, status=status.HTTP_201_CREATED)


@extend_schema(responses={200: HealthSerializer, 503: HealthSerializer})
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
