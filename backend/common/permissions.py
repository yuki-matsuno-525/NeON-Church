"""
共通パーミッションクラス。

アプリをまたいで使い回せるパーミッションをここに定義する。
アプリ固有のパーミッション（例：IsProjectOwner）は各アプリの views.py に置く。
"""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """オブジェクトの `user` フィールドがリクエストユーザーと一致する場合のみ許可する。

    Comment, Bookmark など「ユーザーが作成したオブジェクト」に対して使う。
    """

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
