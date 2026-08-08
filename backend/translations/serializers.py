from rest_framework import serializers


from .models import Language, TranslationProject, TranslationMembership, TranslationUnit, TranslationComment


class LanguageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Language
        fields = ["id", "tag", "label", "order"]


class TranslationProjectSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    source_book_name = serializers.CharField(source="source_book.name", read_only=True)
    # 書は「書 × 版」で1件なので、書名だけでは何から訳しているのか分からない
    # （エノク書は英訳しか無い／創世記は口語訳とも KJV とも原文とも取れる）。
    # 一覧のカードで書と版を別々に出すため、版も返す。
    source_book_translation = serializers.CharField(source="source_book.translation", read_only=True)
    unit_count = serializers.SerializerMethodField()
    done_count = serializers.SerializerMethodField()
    is_member = serializers.SerializerMethodField()
    membership_status = serializers.SerializerMethodField()
    is_in_library = serializers.SerializerMethodField()

    class Meta:
        model = TranslationProject
        fields = [
            "id", "name", "description", "owner_username",
            "source_book", "source_book_name", "source_book_translation", "target_language",
            "status", "unit_count", "done_count", "is_member", "membership_status", "is_in_library",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner_username", "source_book_name", "source_book_translation", "unit_count", "done_count", "is_member", "membership_status", "is_in_library", "created_at", "updated_at"]

    # 以下4つは、一覧では views.annotate_project_summary が本体クエリでまとめて求める。
    # 1件だけ返す経路（公開切替など）では annotate が無いので、その場で数える方に落ちる。
    # 一覧で annotate が無いと1件あたり4クエリ増えるので、一覧の queryset には必ず付けること。

    def get_unit_count(self, obj):
        annotated = getattr(obj, "annotated_unit_count", None)
        return annotated if annotated is not None else obj.units.count()

    def get_done_count(self, obj):
        annotated = getattr(obj, "annotated_done_count", None)
        if annotated is not None:
            return annotated
        return obj.units.filter(status=TranslationUnit.STATUS_DONE).count()

    def get_is_member(self, obj):
        annotated = getattr(obj, "annotated_is_member", None)
        if annotated is not None:
            return annotated
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        # 作業権限を持つ承認済みメンバーだけをメンバー扱いにする。
        return obj.memberships.filter(
            user=request.user,
            status=TranslationMembership.STATUS_APPROVED,
        ).exists()

    def get_membership_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        return obj.memberships.filter(user=request.user).values_list("status", flat=True).first()

    def get_is_in_library(self, obj):
        annotated = getattr(obj, "annotated_is_in_library", None)
        if annotated is not None:
            return annotated
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
    chapter = serializers.UUIDField(source="verse.chapter_id", read_only=True)
    chapter_number = serializers.IntegerField(source="verse.chapter.number", read_only=True)
    assigned_to_username = serializers.CharField(source="assigned_to.username", read_only=True, allow_null=True)

    class Meta:
        model = TranslationUnit
        fields = [
            "id", "verse", "verse_number", "verse_text", "chapter", "chapter_number",
            "assigned_to", "assigned_to_username",
            "body", "status", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "verse", "verse_number", "verse_text", "chapter", "chapter_number",
            "assigned_to", "assigned_to_username", "created_at", "updated_at",
        ]

    def validate(self, attrs):
        # 作成時（instance なし）のみ重複チェック
        if self.instance is None:
            project = self.context.get("project")
            verse = attrs.get("verse")
            if project and verse and TranslationUnit.objects.filter(project=project, verse=verse).exists():
                raise serializers.ValidationError({"verse": "この節はすでにこのプロジェクトに登録されています。"})
        return attrs


class TranslationUnitCreateSerializer(TranslationUnitSerializer):
    """Owner-only unit creation input; assignment stays on the dedicated endpoint."""

    class Meta(TranslationUnitSerializer.Meta):
        read_only_fields = [
            field
            for field in TranslationUnitSerializer.Meta.read_only_fields
            if field != "verse"
        ]


class TranslationCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    display_body = serializers.SerializerMethodField()

    class Meta:
        model = TranslationComment
        fields = ["id", "unit", "username", "body", "display_body", "is_deleted", "created_at"]
        read_only_fields = ["id", "username", "is_deleted", "created_at"]

    def get_display_body(self, obj):
        if obj.is_deleted:
            return ""
        return obj.body
