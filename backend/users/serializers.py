from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


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


class UserSerializer(serializers.ModelSerializer):
    """レスポンス用。機密フィールドを含まない。"""

    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "bio", "avatar_url", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_avatar_url(self, obj) -> str | None:
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url


class PublicUserSerializer(serializers.ModelSerializer):
    """公開プロフィール用。メールアドレスを含まない。"""

    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "bio", "avatar_url", "created_at"]

    def get_avatar_url(self, obj) -> str | None:
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """プロフィール更新用。bio と avatar を変更可能。"""

    class Meta:
        model = User
        fields = ["bio", "avatar"]
