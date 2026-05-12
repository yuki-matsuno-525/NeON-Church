"""
request_id ミドルウェア。

受信リクエストに X-Request-Id ヘッダがあればそれを使用し、
なければ UUID4 を生成する。
生成した request_id はスレッドローカル（common.logging）とレスポンスヘッダ、
Sentry タグに設定し、ログとエラーレポートを同一リクエストで追跡できるようにする。
"""

import re
import uuid

import sentry_sdk

from common.logging import set_request_id

_UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


class RequestIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        raw = request.headers.get("X-Request-Id", "")
        request_id = raw if _UUID_RE.match(raw) else str(uuid.uuid4())
        request.request_id = request_id

        set_request_id(request_id)
        sentry_sdk.set_tag("request_id", request_id)

        response = self.get_response(request)
        response["X-Request-Id"] = request_id
        return response
