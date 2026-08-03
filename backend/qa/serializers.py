from django.contrib.auth import get_user_model
from rest_framework import serializers

from bible.models import Book, Chapter, Verse
from bible.passage import book_name_for, derive_location, format_location_label
from comments.models import Tag
from common.text import clean_body

from .models import DELETED_BODY, Answer, Question

User = get_user_model()

_TITLE_MAX_LENGTH = 200


def _book_name_cache(serializer) -> dict:
    """書名の引き当て結果を1リクエストのあいだ使い回すための入れ物。

    DRF の context は、一覧を1回シリアライズするあいだ同じものが共有される。
    """
    return serializer.context.setdefault("_book_name_cache", {})


class QAAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class AnswerSerializer(serializers.ModelSerializer):
    user = QAAuthorSerializer(read_only=True)
    # 書き込み時だけ使う。読み出しでは question_id を返さず、質問の下にぶら下げて返す。
    question = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.filter(is_deleted=False), write_only=True
    )
    is_best = serializers.SerializerMethodField()

    class Meta:
        model = Answer
        fields = ["id", "question", "user", "body", "is_deleted", "is_best", "created_at"]
        read_only_fields = ["id", "user", "is_deleted", "created_at"]

    def get_is_best(self, obj) -> bool:
        # 一覧では view が best_answer_id を context に入れておく（回答ごとに質問を引かないため）。
        best_id = self.context.get("best_answer_id", ...)
        if best_id is not ...:
            return best_id == obj.id
        return obj.question.best_answer_id == obj.id

    def to_representation(self, instance: Answer) -> dict:
        """論理削除済みの回答は body を差し替えて返す。"""
        data = super().to_representation(instance)
        if instance.is_deleted:
            data["body"] = DELETED_BODY
        return data

    def validate_body(self, value):
        return clean_body(value)

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class AnswerEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ["body"]

    def validate_body(self, value):
        return clean_body(value)


class BestAnswerSerializer(serializers.ModelSerializer):
    """質問カード・詳細の先頭に出すベストアンサーの要約。"""

    user = QAAuthorSerializer(read_only=True)

    class Meta:
        model = Answer
        fields = ["id", "user", "body", "created_at"]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class QuestionSerializer(serializers.ModelSerializer):
    """質問の読み書き。一覧・詳細・投稿で共用する。

    箇所の入力は verse / chapter / book のいずれか1つ（表示中の訳の id）。
    保存されるのは訳非依存の箇所なので、これらは write-only。
    """

    user = QAAuthorSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, write_only=True, required=False, source="tags"
    )
    verse = serializers.PrimaryKeyRelatedField(
        queryset=Verse.objects.all(), write_only=True, required=False
    )
    chapter = serializers.PrimaryKeyRelatedField(
        queryset=Chapter.objects.all(), write_only=True, required=False
    )
    book = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(), write_only=True, required=False
    )

    best_answer = BestAnswerSerializer(read_only=True)
    answer_count = serializers.SerializerMethodField()
    book_slug = serializers.SerializerMethodField()
    book_name = serializers.SerializerMethodField()
    location_label = serializers.SerializerMethodField()
    version_label = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            "id",
            "user",
            "title",
            "body",
            "created_at",
            "is_deleted",
            "verse",
            "chapter",
            "book",
            "book_slug",
            "book_name",
            "chapter_number",
            "verse_number",
            "location_label",
            "version_label",
            "tags",
            "tag_ids",
            "best_answer",
            "answer_count",
        ]
        read_only_fields = [
            "id",
            "user",
            "created_at",
            "is_deleted",
            "chapter_number",
            "verse_number",
            "tags",
            "best_answer",
        ]

    def get_answer_count(self, obj) -> int:
        # 一覧では view が annotate する。投稿直後など annotate が無い場面では数え直す。
        count = getattr(obj, "answer_count", None)
        if count is not None:
            return count
        return obj.answers.filter(is_deleted=False).count()

    def get_book_slug(self, obj) -> str:
        return obj.canonical_book.slug if obj.canonical_book_id else ""

    def get_book_name(self, obj) -> str:
        return book_name_for(obj.canonical_book_id, obj.source_translation, _book_name_cache(self))

    def get_location_label(self, obj) -> str:
        name = self.get_book_name(obj)
        return format_location_label(name, obj.chapter_number, obj.verse_number)

    def get_version_label(self, obj) -> str:
        """どの訳を見ながら質問したか。表示の文脈であって、公開範囲ではない。"""
        return obj.source_translation or ""

    def to_representation(self, instance: Question) -> dict:
        data = super().to_representation(instance)
        if instance.is_deleted:
            data["body"] = DELETED_BODY
        return data

    def validate_body(self, value):
        return clean_body(value)

    def validate_title(self, value):
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("A title is required.")
        if len(title) > _TITLE_MAX_LENGTH:
            raise serializers.ValidationError(
                f"Title must be {_TITLE_MAX_LENGTH} characters or fewer."
            )
        return title

    def validate(self, data):
        targets = [
            x for x in (data.get("verse"), data.get("chapter"), data.get("book")) if x is not None
        ]
        if len(targets) != 1:
            raise serializers.ValidationError("Specify exactly one of verse, chapter, or book.")
        return data

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        validated_data["user"] = self.context["request"].user
        # 表示中の訳の id を訳非依存の箇所へ翻訳して保存する。入力自体は保存しない。
        location = derive_location(
            verse=validated_data.pop("verse", None),
            chapter=validated_data.pop("chapter", None),
            book=validated_data.pop("book", None),
        )
        validated_data.update(location)
        question = super().create(validated_data)
        if tags:
            question.tags.set(tags)
        return question


class QuestionEditSerializer(serializers.ModelSerializer):
    """質問の編集。箇所は変えられない（変えたいなら立て直す）。"""

    class Meta:
        model = Question
        fields = ["title", "body"]

    def validate_body(self, value):
        return clean_body(value)

    def validate_title(self, value):
        title = (value or "").strip()
        if not title:
            raise serializers.ValidationError("A title is required.")
        return title
