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

    class Meta:
        model = User
        fields = ["id", "username", "email", "bio", "created_at"]
        read_only_fields = ["id", "created_at"]
