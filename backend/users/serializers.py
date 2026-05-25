import os

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_AVATAR_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5MB


def validate_avatar(value):
    """アバター画像の拡張子・Content-Type・サイズを検証する。"""
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise serializers.ValidationError(
            f"許可されていないファイル形式です。使用可能: {', '.join(ALLOWED_AVATAR_EXTENSIONS)}"
        )
    content_type = getattr(value, "content_type", "")
    if content_type and content_type not in ALLOWED_AVATAR_CONTENT_TYPES:
        raise serializers.ValidationError("許可されていない Content-Type です。")
    if value.size > MAX_AVATAR_SIZE:
        raise serializers.ValidationError("ファイルサイズは 5MB 以内にしてください。")
    return value


class AvatarUrlMixin:
    """`avatar_url` フィールドを提供するシリアライザ用 Mixin。

    `context["request"]` があれば絶対 URL を返す。なければ相対 URL を返す。
    両方のプロフィールシリアライザ（UserSerializer / PublicUserSerializer）で使う。
    """

    def get_avatar_url(self, obj) -> str | None:
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url


class RegisterSerializer(serializers.ModelSerializer):
    """ユーザー登録用。password は write_only で最低8文字。"""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password"]
        extra_kwargs = {
            "email": {"required": True},
        }

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class UserSerializer(AvatarUrlMixin, serializers.ModelSerializer):
    """レスポンス用（認証済みユーザー自身）。機密フィールドを含まない。"""

    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "bio",
            "avatar_url",
            "bookmarks_visibility",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PublicUserSerializer(AvatarUrlMixin, serializers.ModelSerializer):
    """公開プロフィール用（他ユーザーから見える情報）。メールアドレスを含まない。"""

    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "bio",
            "avatar_url",
            "bookmarks_visibility",
            "created_at",
        ]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """プロフィール更新用。bio / avatar / bookmarks_visibility を変更可能。"""

    avatar = serializers.ImageField(required=False, validators=[validate_avatar])

    class Meta:
        model = User
        fields = ["bio", "avatar", "bookmarks_visibility"]
