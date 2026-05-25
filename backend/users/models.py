import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    カスタムユーザーモデル。
    AbstractUser を継承し、主キーを UUID に変更する。
    common.BaseModel は AbstractUser との多重継承で id フィールドが競合するため継承しない。
    代わりに同じフィールドをここで直接定義する。
    """

    BOOKMARKS_PRIVATE = "private"
    BOOKMARKS_PUBLIC = "public"
    BOOKMARKS_VISIBILITY_CHOICES = [
        (BOOKMARKS_PRIVATE, "非公開"),
        (BOOKMARKS_PUBLIC, "公開"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bio = models.TextField(blank=True, default="", max_length=500)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    # 公開プロフィールでお気に入りを他ユーザーに見せるかどうか。
    # 既定は private（プライバシー優先）。明示的に "public" にすると公開される。
    bookmarks_visibility = models.CharField(
        max_length=10,
        choices=BOOKMARKS_VISIBILITY_CHOICES,
        default=BOOKMARKS_PRIVATE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"
