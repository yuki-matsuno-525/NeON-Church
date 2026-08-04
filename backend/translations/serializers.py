from rest_framework import serializers

from .models import (
    Language,
    TranslationComment,
    TranslationMembership,
    TranslationProject,
    TranslationUnit,
)


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
    membership_status = serializers.SerializerMethodField()
    is_in_library = serializers.SerializerMethodField()

    class Meta:
        model = TranslationProject
        fields = [
            "id",
            "name",
            "description",
            "owner_username",
            "source_book",
            "source_book_name",
            "target_language",
            "status",
            "unit_count",
            "done_count",
            "is_member",
            "membership_status",
            "is_in_library",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner_username",
            "source_book_name",
            "unit_count",
            "done_count",
            "is_member",
            "membership_status",
            "is_in_library",
            "created_at",
            "updated_at",
        ]

    # 以下5つは、一覧では selectors.annotate_project_summary が本体クエリでまとめて求める。
    # 1件だけ返す経路（公開切替など）では annotate が無いので、その場で数える方に落ちる。
    # 一覧で annotate が無いと1件あたり5クエリ増えるので、一覧の queryset には必ず付けること
    # （tests/test_query_counts.py が件数に比例しないことを見張っている）。

    def get_unit_count(self, obj) -> int:
        annotated = getattr(obj, "annotated_unit_count", None)
        return annotated if annotated is not None else obj.units.count()

    def get_done_count(self, obj) -> int:
        annotated = getattr(obj, "annotated_done_count", None)
        if annotated is not None:
            return annotated
        return obj.units.filter(status=TranslationUnit.STATUS_DONE).count()

    def get_is_member(self, obj) -> bool:
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

    def get_membership_status(self, obj) -> str | None:
        if hasattr(obj, "annotated_membership_status"):
            return obj.annotated_membership_status
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        return obj.memberships.filter(user=request.user).values_list("status", flat=True).first()

    def get_is_in_library(self, obj) -> bool:
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
    assigned_to_username = serializers.CharField(
        source="assigned_to.username", read_only=True, allow_null=True
    )

    class Meta:
        model = TranslationUnit
        fields = [
            "id",
            "verse",
            "verse_number",
            "verse_text",
            "chapter",
            "chapter_number",
            "assigned_to",
            "assigned_to_username",
            "body",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "verse",
            "verse_number",
            "verse_text",
            "chapter",
            "chapter_number",
            "assigned_to",
            "assigned_to_username",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        # 作成時（instance なし）のみ重複チェック
        if self.instance is None:
            project = self.context.get("project")
            verse = attrs.get("verse")
            if (
                project
                and verse
                and TranslationUnit.objects.filter(project=project, verse=verse).exists()
            ):
                raise serializers.ValidationError(
                    {"verse": "この節はすでにこのプロジェクトに登録されています。"}
                )
        return attrs


class TranslationUnitCreateSerializer(TranslationUnitSerializer):
    """Owner-only unit creation input; assignment stays on the dedicated endpoint."""

    class Meta(TranslationUnitSerializer.Meta):
        read_only_fields = [
            field for field in TranslationUnitSerializer.Meta.read_only_fields if field != "verse"
        ]


class TranslationCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    display_body = serializers.SerializerMethodField()

    class Meta:
        model = TranslationComment
        fields = ["id", "unit", "username", "body", "display_body", "is_deleted", "created_at"]
        read_only_fields = ["id", "username", "is_deleted", "created_at"]

    def get_display_body(self, obj) -> str:
        if obj.is_deleted:
            return ""
        return obj.body


# ---------------------------------------------------------------------------
# 複合レスポンス・入力の宣言
#
# 下のシリアライザは保存にも検証にも使わない。集計や一括操作の戻り値・入力の形を
# スキーマへ出すためだけに置く。
# ---------------------------------------------------------------------------


class UnitStatusCountsSerializer(serializers.Serializer):
    """ユニットの状態ごとの件数。キーは TranslationUnit.STATUS_CHOICES と同じ。"""

    todo = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    review = serializers.IntegerField()
    done = serializers.IntegerField()


class ChapterSummarySerializer(serializers.Serializer):
    """章ボタンに出す1章ぶんの内訳。"""

    number = serializers.IntegerField()
    total = serializers.IntegerField()
    status_counts = UnitStatusCountsSerializer()


class TranslationUnitSummaryResponseSerializer(serializers.Serializer):
    """章ボタンと「レビュー(N)」バッジのための軽い集計。"""

    chapters = serializers.ListField(child=serializers.IntegerField())
    chapter_summaries = ChapterSummarySerializer(many=True)
    status_counts = UnitStatusCountsSerializer()
    assigned_to_me = serializers.IntegerField()
    total = serializers.IntegerField()


class TranslationReadResponseSerializer(serializers.Serializer):
    """公開済み翻訳の閲覧。chapter 未指定なら units は空（目次用）。"""

    chapters = serializers.ListField(child=serializers.IntegerField())
    units = TranslationUnitSerializer(many=True)


class MembershipDecisionSerializer(serializers.Serializer):
    """参加申請の承認・拒否。"""

    status = serializers.ChoiceField(
        choices=[
            TranslationMembership.STATUS_APPROVED,
            TranslationMembership.STATUS_REJECTED,
        ]
    )


class UnitAssignSerializer(serializers.Serializer):
    """担当者の割り当て。null を渡すと担当を外す。"""

    user_id = serializers.UUIDField(allow_null=True)


class BookSelectionSerializer(serializers.Serializer):
    """書の一括追加・削除の対象。表示中の訳の書 id。"""

    book_id = serializers.UUIDField()


class BookAddedSerializer(serializers.Serializer):
    """一括追加の結果。created は実際に作られた数（既存はスキップ）。"""

    created = serializers.IntegerField()
    book_name = serializers.CharField()


class BookRemovedSerializer(serializers.Serializer):
    """一括削除の結果。"""

    deleted = serializers.IntegerField()
    book_name = serializers.CharField()
