from django.db import transaction
from rest_framework import serializers

from bible.models import Book, CanonicalBook
from .models import (
    MAX_DAYS_PER_PLAN,
    MAX_READINGS_PER_DAY,
    Plan,
    PlanDay,
    PlanDayReading,
    PlanSubscription,
)


class PlanReadingSerializer(serializers.ModelSerializer):
    """
    その日に読む章1つ。入出力とも訳非依存の書 slug（例: "matthew"）でやりとりする。
    """

    book = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=CanonicalBook.objects.all(),
        source="canonical_book",
    )
    # 画面に出す書名（指定の訳、無ければ既定の訳のもの）。読むだけの情報。
    book_name = serializers.SerializerMethodField()

    class Meta:
        model = PlanDayReading
        fields = ["id", "book", "book_name", "chapter_number", "translation", "order"]
        read_only_fields = ["id", "order"]

    def get_book_name(self, obj) -> str:
        editions = list(Book.objects.filter(canonical_book_id=obj.canonical_book_id))
        if not editions:
            return obj.canonical_book.slug
        if obj.translation:
            for book in editions:
                if book.translation == obj.translation:
                    return book.name
        for book in editions:
            if book.translation == "口語訳":
                return book.name
        return sorted(editions, key=lambda book: book.order)[0].name


class PlanDaySerializer(serializers.ModelSerializer):
    readings = PlanReadingSerializer(many=True, required=False)
    # 読んだかどうか。読んでいる人が取得したときだけ true / false が入る。
    completed = serializers.SerializerMethodField()

    class Meta:
        model = PlanDay
        fields = ["id", "number", "title", "devotional", "readings", "completed"]
        read_only_fields = ["id", "number"]

    def get_completed(self, obj) -> bool:
        completed_day_ids = self.context.get("completed_day_ids")
        if completed_day_ids is None:
            return False
        return obj.id in completed_day_ids

    def validate_readings(self, value: list) -> list:
        if len(value) > MAX_READINGS_PER_DAY:
            raise serializers.ValidationError(
                f"1日に入れられる章は{MAX_READINGS_PER_DAY}までです。"
            )
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        # 章の並びは丸ごと入れ替える。1日に10章までなので、差分を取るより単純で間違いがない。
        readings = validated_data.pop("readings", None)
        instance = super().update(instance, validated_data)
        if readings is not None:
            instance.readings.all().delete()
            PlanDayReading.objects.bulk_create(
                [
                    PlanDayReading(day=instance, order=order, **reading)
                    for order, reading in enumerate(readings)
                ]
            )
        return instance


class PlanListSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    day_count = serializers.IntegerField(source="days.count", read_only=True)
    reader_count = serializers.IntegerField(source="subscriptions.count", read_only=True)

    class Meta:
        model = Plan
        fields = [
            "id",
            "title",
            "description",
            "visibility",
            "owner_username",
            "day_count",
            "reader_count",
            "created_at",
            "updated_at",
        ]


class PlanDetailSerializer(PlanListSerializer):
    days = PlanDaySerializer(many=True, read_only=True)
    # 日の並びを変えられるかどうか。1人でも読み始めたら固まる。
    can_reorder_days = serializers.SerializerMethodField()
    # 読んでいる人の状態（読んでいなければ null）。
    subscription = serializers.SerializerMethodField()

    class Meta(PlanListSerializer.Meta):
        fields = PlanListSerializer.Meta.fields + [
            "note",
            "days",
            "can_reorder_days",
            "subscription",
        ]

    def get_can_reorder_days(self, obj) -> bool:
        return not obj.has_readers

    def get_subscription(self, obj) -> dict | None:
        subscription = self.context.get("subscription")
        if subscription is None:
            return None
        return {
            "id": str(subscription.id),
            "started_at": subscription.started_at,
            "is_active": subscription.is_active,
        }


class PlanWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ["id", "title", "description", "note", "visibility"]

    def validate_title(self, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("題を入れてください。")
        return cleaned

    def validate(self, attrs: dict) -> dict:
        # 中身が1日も無いまま公開すると、読み始めた人がいきなり終わってしまう。
        visibility = attrs.get(
            "visibility", getattr(self.instance, "visibility", Plan.VISIBILITY_PRIVATE)
        )
        if visibility != Plan.VISIBILITY_PRIVATE and self.instance is not None:
            if not self.instance.days.exists():
                raise serializers.ValidationError(
                    {"visibility": "公開するには、1日以上の中身が必要です。"}
                )
        return attrs


class PlanSubscriptionSerializer(serializers.ModelSerializer):
    plan_title = serializers.CharField(source="plan.title", read_only=True)

    class Meta:
        model = PlanSubscription
        fields = ["id", "plan", "plan_title", "started_at", "is_active"]
        read_only_fields = fields


def check_day_limit(plan: Plan) -> None:
    if plan.days.count() >= MAX_DAYS_PER_PLAN:
        raise serializers.ValidationError(
            {"detail": f"プランは{MAX_DAYS_PER_PLAN}日までです。"}
        )
