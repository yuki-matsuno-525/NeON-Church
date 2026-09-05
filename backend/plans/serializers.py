from django.db import transaction
from rest_framework import serializers

from bible.editions import pick_edition
from bible.models import Book, CanonicalBook
from .models import (
    MAX_DAYS_PER_PLAN,
    MAX_READINGS_PER_DAY,
    Plan,
    PlanDay,
    PlanDayReading,
    PlanSubscription,
)
from .progress import resync_day_progress_for_all_readers


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
    # その章を読み終えたか。読んでいる人が取得したときだけ true / false が入る。
    completed = serializers.SerializerMethodField()

    class Meta:
        model = PlanDayReading
        fields = ["id", "book", "book_name", "chapter_number", "translation", "order", "completed"]
        read_only_fields = ["id", "order", "completed"]

    def get_completed(self, obj) -> bool:
        completed_reading_ids = self.context.get("completed_reading_ids")
        if completed_reading_ids is None:
            return False
        return obj.id in completed_reading_ids

    def get_book_name(self, obj) -> str:
        editions = Book.objects.filter(canonical_book_id=obj.canonical_book_id)
        book = pick_edition(editions, obj.translation)
        return book.name if book else obj.canonical_book.slug


class PlanDaySerializer(serializers.ModelSerializer):
    readings = PlanReadingSerializer(many=True, required=False)
    # その日を読み終えたか。章に全部印が付いたときだけ true になる。
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
        readings = validated_data.pop("readings", None)
        instance = super().update(instance, validated_data)
        if readings is not None:
            self._replace_readings(instance, readings)
            # 章が増減すると「その日を読み終えた」が実態と合わなくなるので付け直す。
            resync_day_progress_for_all_readers(instance)
        return instance

    @staticmethod
    def _replace_readings(day: PlanDay, readings: list[dict]) -> None:
        """
        その日の章を、送られてきた並びに合わせる。

        丸ごと消して作り直すほうが単純だが、それをすると読んでいる人が付けた
        章ごとの印（PlanReadingProgress は章の行に紐づく）まで道連れに消える。
        書いた人が題を直しただけで読者の印が消えるのは困るので、
        同じ章（書・章番号・訳が一致）はその行のまま残し、順番だけ付け直す。
        """
        def key(book_id, chapter_number, translation):
            return (str(book_id), chapter_number, translation or "")

        existing_by_key = {}
        for existing in day.readings.all():
            existing_by_key.setdefault(
                key(existing.canonical_book_id, existing.chapter_number, existing.translation),
                [],
            ).append(existing)

        kept_ids = []
        to_create = []
        for order, reading in enumerate(readings):
            candidates = existing_by_key.get(
                key(
                    reading["canonical_book"].id,
                    reading["chapter_number"],
                    reading.get("translation", ""),
                )
            )
            if candidates:
                existing = candidates.pop(0)
                kept_ids.append(existing.id)
                if existing.order != order:
                    existing.order = order
                    existing.save(update_fields=["order", "updated_at"])
            else:
                to_create.append(PlanDayReading(day=day, order=order, **reading))

        day.readings.exclude(id__in=kept_ids).delete()
        PlanDayReading.objects.bulk_create(to_create)


class PlanListSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    day_count = serializers.IntegerField(source="days.count", read_only=True)
    reader_count = serializers.SerializerMethodField()

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

    def get_reader_count(self, obj) -> int:
        """「読書中」は、停止済みの購読を除いた現在の人数だけを返す。"""
        annotated = getattr(obj, "active_reader_count", None)
        if annotated is not None:
            return annotated
        return obj.subscriptions.filter(is_active=True).count()


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
        if visibility != Plan.VISIBILITY_PRIVATE:
            # 作成時点ではまだ日を追加できないため、公開・限定公開での直接作成も拒否する。
            if self.instance is None or not self.instance.days.exists():
                raise serializers.ValidationError(
                    {"visibility": "公開するには、1日以上の中身が必要です。"}
                )
        return attrs


class PlanSubscriptionSerializer(serializers.ModelSerializer):
    plan_title = serializers.CharField(source="plan.title", read_only=True)
    # 「何日中いくつ終わったか」。読み終わっても is_active は true のままなので
    # （落ちるのは「やめる」を押したときだけ）、この 2 つが無いと画面は
    # 読書中と読み終わったものを見分けられない。
    day_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()

    class Meta:
        model = PlanSubscription
        fields = [
            "id", "plan", "plan_title", "started_at", "is_active",
            "day_count", "completed_count",
        ]
        read_only_fields = fields

    # 一覧では views の annotate が本体クエリでまとめて数える。
    # 付いていなければその場で数える（1 件だけ返す経路のため）。
    def get_day_count(self, obj) -> int:
        annotated = getattr(obj, "annotated_day_count", None)
        return annotated if annotated is not None else obj.plan.days.count()

    def get_completed_count(self, obj) -> int:
        annotated = getattr(obj, "annotated_completed_count", None)
        return annotated if annotated is not None else obj.progress.count()


def check_day_limit(plan: Plan) -> None:
    if plan.days.count() >= MAX_DAYS_PER_PLAN:
        raise serializers.ValidationError(
            {"detail": f"プランは{MAX_DAYS_PER_PLAN}日までです。"}
        )
