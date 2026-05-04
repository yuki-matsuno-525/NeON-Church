from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, Report

User = get_user_model()

_DELETED_BODY = "このコメントは削除されました"


class CommentAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class CommentSerializer(serializers.ModelSerializer):
    user = CommentAuthorSerializer(read_only=True)
    # annotate(vote_count=Count("votes")) がない場合（POST レスポンス等）は 0 を返す
    vote_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "user", "verse", "parent", "body", "is_deleted", "created_at", "vote_count"]
        read_only_fields = ["id", "user", "is_deleted", "created_at", "vote_count"]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def to_representation(self, instance: Comment) -> dict:
        """論理削除済みのコメントは body を差し替えて返す。"""
        data = super().to_representation(instance)
        if instance.is_deleted:
            data["body"] = _DELETED_BODY
        return data

    def validate(self, data):
        parent = data.get("parent")
        if parent and parent.verse_id != data.get("verse").pk:
            raise serializers.ValidationError(
                {"parent": "返信先コメントは同じ節のものである必要があります。"}
            )
        return data

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "reason", "created_at"]
        read_only_fields = ["id", "created_at"]
