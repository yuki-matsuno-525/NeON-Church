"""
共通パーミッションクラス。

アプリをまたいで使い回せるパーミッションをここに定義する。
アプリ固有のパーミッション（例：IsApprovedMember）は各アプリの views.py に置く。

「持ち主だけ」は所有者を指す列名がモデルごとに違う（user か owner か）ので、
IsOwner / IsOwnerByField を使い分ける。アプリごとに書き起こさないこと。
"""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """オブジェクトの `user` フィールドがリクエストユーザーと一致する場合のみ許可する。

    Comment, Bookmark など「ユーザーが作成したオブジェクト」に対して使う。
    """

    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class IsOwnerOf(permissions.BasePermission):
    """所有者を `owner` で持つモデル（Article / Plan / TranslationProject）向け。

    ビューによっては本体そのもの（Plan）ではなく、その子（PlanDay）が渡る。
    `owner_id` を持たないオブジェクトが来たら `parent_attr` をたどって本体を探す。

        class IsPlanOwner(IsOwnerOf):
            parent_attr = "plan"
    """

    parent_attr: str | None = None

    def has_object_permission(self, request, view, obj):
        if not hasattr(obj, "owner_id") and self.parent_attr:
            obj = getattr(obj, self.parent_attr)
        return getattr(obj, "owner_id", None) == request.user.id
