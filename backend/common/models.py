import uuid

from django.db import models


class BaseModel(models.Model):
    """
    全モデルの抽象基底クラス。
    主キーに UUID を使用し、作成日時・更新日時を自動付与する。
    継承先で class Meta の abstract = True を再定義する必要はない。
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
