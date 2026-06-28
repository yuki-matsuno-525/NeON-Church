from rest_framework import serializers


from .models import Language, TranslationProject, TranslationMembership, TranslationUnit, TranslationComment


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ["id", "tag", "label", "order"]


class TranslationProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    source_book_name = serializers.CharField(source="source_book.name", read_only=True)
    unit_count = serializers.SerializerMethodField()
    done_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    is_in_library = serializers.SerializerMethodField()

    class Meta:
        model = TranslationProject
        fields = [
            "id", "name", "description", "owner_username",
            "source_book", "source_book_name", "target_language",
            "status", "unit_count", "done_count", "is_member", "is_in_library",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner_username", "source_book_name", "unit_count", "done_count", "is_member", "is_in_library", "created_at", "updated_at"]

    def get_unit_count(self, obj):
        return obj.units.count()

    def get_done_count(self, obj):
        return obj.units.filter(status=TranslationUnit.STATUS_DONE).count()

    def get_is_member(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        # PENDING（申請済み）も含めてメンバー扱いにし、二重申請ボタン表示を防ぐ
        return obj.memberships.filter(
            user=request.user,
            status__in=[TranslationMembership.STATUS_APPROVED, TranslationMembership.STATUS_PENDING],
        ).exists()

    def get_is_in_library(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.library_entries.filter(user=request.user).exists()


class TranslationMembershipSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = TranslationMembership
        fields = ["id", "user", "username", "role", "status", "created_at"]
        read_only_fields = ["id", "user", "username", "created_at"]


class TranslationUnitSerializer(serializers.ModelSerializer):
    verse_number = serializers.IntegerField(source="verse.number", read_only=True)
    verse_text = serializers.CharField(source="verse.text", read_only=True)
    chapter_number = serializers.IntegerField(source="verse.chapter.number", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True, allow_null=True)

    class Meta:
        model = TranslationUnit
        fields = [
            "id", "verse", "verse_number", "verse_text", "chapter_number",
            "assigned_to", "assigned_to_username",
            "body", "status", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "verse_number", "verse_text", "chapter_number", "assigned_to_username", "created_at", "updated_at"]

    def validate(self, attrs):
        # 作成時（instance なし）のみ重複チェック
        if self.instance is None:
            project = self.context.get("project")
            verse = attrs.get("verse")
            if project and verse and TranslationUnit.objects.filter(project=project, verse=verse).exists():
                raise serializers.ValidationError({"verse": "この節はすでにこのプロジェクトに登録されています。"})
        return attrs


class TranslationCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    display_body = serializers.SerializerMethodField()

    class Meta:
        model = TranslationComment
        fields = ["id", "unit", "username", "body", "display_body", "is_deleted", "created_at"]
        read_only_fields = ["id", "username", "is_deleted", "created_at"]

    def get_display_body(self, obj):
        if obj.is_deleted:
            return "削除されました"
        return obj.body
