"""
JSON 構造化ロギング。

すべてのログを JSON 形式で出力し、機密情報をマスキングする。
RequestIdFilter を LOGGING 設定に組み込むことで、各ログレコードに
スレッドローカルな request_id を自動付与する。
"""

import json
import logging
import re
import threading
from datetime import datetime, timezone

# スレッドごとに request_id を保持する（同時リクエストで混在しないよう分離）
_local = threading.local()

# マスキング対象のパターン。JSON フィールド名・HTTP ヘッダ・メールアドレスを網羅する。
# コメント本文はビュー層でログ出力しない方針のため、ここでは対象外。
_MASK_PATTERNS: list[tuple[re.Pattern, str]] = [
    # JSON フィールド: "password": "..."
    (re.compile(r'("password"\s*:\s*)"[^"]*"', re.IGNORECASE), r'\1"***"'),
    # JWT / トークン系フィールド
    (re.compile(r'("(?:token|access|refresh)"\s*:\s*)"[^"]*"', re.IGNORECASE), r'\1"***"'),
    # Authorization ヘッダ
    (re.compile(r'(Authorization:\s*(?:Bearer|Token)\s+)\S+', re.IGNORECASE), r'\1***'),
    # Cookie ヘッダ（値全体をマスク）
    (re.compile(r'(Cookie:\s*).*', re.IGNORECASE), r'\1***'),
    # メールアドレス
    (re.compile(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b'), '***@***.***'),
]


def set_request_id(request_id: str) -> None:
    """ミドルウェアがリクエスト開始時に呼び出す。"""
    _local.request_id = request_id


def get_request_id() -> str:
    return getattr(_local, "request_id", "-")


def _mask(text: str) -> str:
    for pattern, replacement in _MASK_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class RequestIdFilter(logging.Filter):
    """ログレコードに request_id を付与するフィルター。"""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        return True


class JsonFormatter(logging.Formatter):
    """ログを JSON 形式に変換するフォーマッター。"""

    def format(self, record: logging.LogRecord) -> str:
        data: dict = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": _mask(record.getMessage()),
            "module": record.module,
            "line": record.lineno,
            "request_id": getattr(record, "request_id", "-"),
        }

        if record.exc_info:
            data["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(data, ensure_ascii=False)
