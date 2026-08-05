"""drf-spectacular にこのプロジェクト固有の事情を教えるための拡張。

ここに置いたクラスは import された時点で drf-spectacular に登録される。
`common.apps.CommonConfig.ready()` から読み込んでいるので、
呼び出し側で明示的に import する必要はない。
"""

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework import serializers


class DetailSerializer(serializers.Serializer):
    """`{"detail": "..."}` だけを返すレスポンス。

    DRF の慣用形なので、書き込み系の成功・失敗メッセージの多くがこの形になる。
    スキーマ上で使い回すためにここに 1 つだけ置く。
    """

    detail = serializers.CharField()


class CookieJWTAuthenticationExtension(OpenApiAuthenticationExtension):
    """Cookie の access_token による認証をスキーマに載せる。

    drf-spectacular は既定で Authorization ヘッダ方式の認証しか解決できず、
    独自の認証クラスはビューごとに「解決できない」警告になる。
    ここで 1 度宣言すれば全ビューぶんの警告が消える。
    """

    target_class = "users.authentication.CookieJWTAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": "access_token",
        }
