from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
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
    """レスポンス用（認証済みユーザー自身）。機密フィールドを含まない。"""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "bio",
            "bookmarks_visibility",
            "email_notifications_enabled",
            "in_app_notifications_enabled",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PublicUserSerializer(serializers.ModelSerializer):
    """公開プロフィール用（他ユーザーから見える情報）。メールアドレスを含まない。"""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "bio",
            "bookmarks_visibility",
            "created_at",
        ]


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """プロフィール更新用。bio / bookmarks_visibility を変更可能。"""

    class Meta:
        model = User
        fields = ["bio", "bookmarks_visibility"]


class AccountSettingsSerializer(UserSerializer):
    has_usable_password = serializers.SerializerMethodField()
    social_providers = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = [
            *UserSerializer.Meta.fields,
            "has_usable_password",
            "social_providers",
        ]

    def get_has_usable_password(self, obj):
        return obj.has_usable_password()

    def get_social_providers(self, obj):
        return list(obj.social_accounts.order_by("provider").values_list("provider", flat=True))


class IdentityUpdateSerializer(serializers.Serializer):
    username = serializers.CharField(
        required=False,
        max_length=150,
        validators=[UnicodeUsernameValidator()],
    )
    email = serializers.EmailField(required=False, max_length=254)
    current_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.has_usable_password() or not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        if "username" not in attrs and "email" not in attrs:
            raise serializers.ValidationError("Provide a username or email address.")

        username = attrs.get("username")
        if username is not None:
            username = username.strip()
            if not username:
                raise serializers.ValidationError({"username": "Username may not be blank."})
            if User.objects.exclude(pk=user.pk).filter(username__iexact=username).exists():
                raise serializers.ValidationError({"username": "This username is already in use."})
            attrs["username"] = username

        email = attrs.get("email")
        if email is not None:
            email = User.objects.normalize_email(email).lower()
            if User.objects.exclude(pk=user.pk).filter(email__iexact=email).exists():
                raise serializers.ValidationError({"email": "This email address is already in use."})
            attrs["email"] = email
        return attrs

    def save(self):
        user = self.context["request"].user
        for field in ("username", "email"):
            if field in self.validated_data:
                setattr(user, field, self.validated_data[field])
        user.save(update_fields=[
            *(field for field in ("username", "email") if field in self.validated_data),
            "updated_at",
        ])
        return user


class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email_notifications_enabled", "in_app_notifications_enabled"]


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.has_usable_password() or not user.check_password(attrs["current_password"]):
            raise serializers.ValidationError({"current_password": "Current password is incorrect."})
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "Choose a different password."})
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": exc.messages}) from None
        return attrs


class AccountDeletionSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate(self, attrs):
        user = self.context["request"].user
        if attrs["username"] != user.username:
            raise serializers.ValidationError({"username": "Username does not match."})
        if user.has_usable_password() and not user.check_password(attrs.get("password", "")):
            raise serializers.ValidationError({"password": "Password is incorrect."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
