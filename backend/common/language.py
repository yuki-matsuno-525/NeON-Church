"""画面の言語（日本語か英語か）を、リクエストのあいだ覚えておく小道具。

フロントは画面の言語を Accept-Language（"ja" / "en"）で送ってくる。
解釈書の章の名前のように、データ側に日本語と英語の両方があるものは、
これを見て出し分ける。シリアライザーの奥から呼ばれるので、
引数で持ち回さずにリクエスト単位の変数に置く。
"""

from contextvars import ContextVar

_ui_language: ContextVar[str] = ContextVar("ui_language", default="ja")


def language_from_header(header: str) -> str:
    """Accept-Language の値を "ja" か "en" にする。英語で始まるときだけ "en"。"""
    return "en" if header.strip().lower().startswith("en") else "ja"


def ui_language() -> str:
    """いま処理しているリクエストの画面の言語（"ja" / "en"）。"""
    return _ui_language.get()


class UiLanguageMiddleware:
    """Accept-Language を読んで、リクエストのあいだ ui_language() で返せるようにする。"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        token = _ui_language.set(language_from_header(request.headers.get("Accept-Language", "")))
        try:
            return self.get_response(request)
        finally:
            _ui_language.reset(token)
