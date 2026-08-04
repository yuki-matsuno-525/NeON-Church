from django.contrib.auth import get_user_model
from rest_framework import serializers

from bible.models import Book, Chapter, Verse
from bible.passage import book_name_for, derive_location, format_location_label
from common.text import clean_body as _clean_body

from .models import DELETED_COMMENT_BODY, Comment, Report, Tag

User = get_user_model()


# ---------------------------------------------------------------------------
# 位置情報ヘルパー
# ---------------------------------------------------------------------------


def book_name_cache(serializer) -> dict:
    """書名の引き当て結果を1リクエストのあいだ使い回すための入れ物。

    DRF の context は、一覧を1回シリアライズするあいだ同じものが共有される。
    そこに結果を貯めることで、同じ (書, 訳) の組を何度も DB に聞かずに済む。
    """
    return serializer.context.setdefault("_book_name_cache", {})


def _get_location_parts(
    obj: Comment, cache: dict | None = None
) -> tuple[str, int | None, int | None]:
    """コメントの書名・章番号・節番号を返す。

    書名の引き当て（訳ごとに呼び名が違う）は bible.passage.book_name_for が行う。
    1件のコメントにつき4回（書名・章・節・ラベル）呼ばれるので、`cache`
    （book_name_cache が返す辞書）を渡して同じ組を使い回す。
    """
    if not obj.canonical_book_id:
        return "", None, None
    name = book_name_for(obj.canonical_book_id, obj.source_translation, cache)
    return name, obj.chapter_number, obj.verse_number


def _get_version_label(obj: Comment) -> str:
    """コメントがどのバージョンのものかを表すラベルを返す。

    翻訳プロジェクト向けならプロジェクト名、聖書本体なら投稿時の訳名（source_translation）。
    段階6D: コメントは箇所で訳横断に集約表示するため、これは「どの訳を見ながら投稿したか」の
    文脈ラベルであって、公開範囲を表すものではない（フロントは「投稿時: 〜」と表示する）。
    """
    if obj.translation_project_id and obj.translation_project:
        return obj.translation_project.name
    return obj.source_translation or ""


_format_location_label = format_location_label


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class CommentAuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class CommentSerializer(serializers.ModelSerializer):
    user = CommentAuthorSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    # 「返信 N件」の表示用。返信を開く前に件数だけ知りたいので、一覧の annotate から取る。
    reply_count = serializers.SerializerMethodField()
    version_label = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, write_only=True, required=False, source="tags"
    )
    # 段階6F: verse/chapter/book は「箇所を引くための write-only 入力」。保存はしない
    # （Comment の実体は canonical_book/章/節）。レスポンスには含めない。
    verse = serializers.PrimaryKeyRelatedField(
        queryset=Verse.objects.all(), write_only=True, required=False
    )
    chapter = serializers.PrimaryKeyRelatedField(
        queryset=Chapter.objects.all(), write_only=True, required=False
    )
    book = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.all(), write_only=True, required=False
    )

    class Meta:
        model = Comment
        fields = [
            "id",
            "user",
            "verse",
            "chapter",
            "book",
            "translation_project",
            "version_label",
            "parent",
            "body",
            "is_deleted",
            "created_at",
            "vote_count",
            "reply_count",
            "tags",
            "tag_ids",
        ]
        read_only_fields = [
            "id",
            "user",
            "is_deleted",
            "created_at",
            "vote_count",
            "reply_count",
            "version_label",
            "tags",
        ]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def get_reply_count(self, obj) -> int:
        # 投稿直後のレスポンスなど annotate していない場面では 0（返信はまだ無い）。
        return getattr(obj, "reply_count", 0)

    def get_version_label(self, obj) -> str:
        return _get_version_label(obj)

    def to_representation(self, instance: Comment) -> dict:
        """論理削除済みのコメントは body を差し替えて返す。"""
        data = super().to_representation(instance)
        if instance.is_deleted:
            data["body"] = DELETED_COMMENT_BODY
        return data

    def validate_body(self, value):
        return _clean_body(value)

    def validate(self, data):
        verse = data.get("verse")
        chapter = data.get("chapter")
        book = data.get("book")
        parent = data.get("parent")

        targets = [x for x in [verse, chapter, book] if x is not None]
        # 返信も含め、すべてのコメントは書・章・節のちょうど1つの粒度を必ず持つ。
        # （3列すべて NULL は DB の CHECK でも禁止している。）
        if len(targets) != 1:
            raise serializers.ValidationError("Specify exactly one of verse, chapter, or book.")

        if parent:
            # 段階6D: 返信は親と「同じ箇所」であればよい（訳が違っても可）。旧 verse_id 一致から
            # 箇所（canonical_book/章/節）一致へ緩める。これで KJV を見ながら口語訳コメントへ
            # 返信できる（同じスレッドに集約される）。
            loc = self._derive_location(data)
            if (
                loc["canonical_book"].id != parent.canonical_book_id
                or loc["chapter_number"] != parent.chapter_number
                or loc["verse_number"] != parent.verse_number
            ):
                raise serializers.ValidationError({"parent": "Reply must target the same passage."})
            # 返信は親と同じスコープ（翻訳プロジェクト／聖書本体）に必ず属させる。
            data["translation_project"] = parent.translation_project

        return data

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        validated_data["user"] = self.context["request"].user
        # 段階6F: verse/chapter/book 入力から箇所（canonical_book/章/節）と投稿時訳を導出して保存する。
        # 入力自体は保存しないので取り除く。値はクライアント入力を信用せず入力 FK から導出する。
        # 返信も返信自身の入力 FK から導出する（親からの継承はしない）。
        validated_data.update(self._derive_location(validated_data))
        for field in ("verse", "chapter", "book"):
            validated_data.pop(field, None)
        comment = super().create(validated_data)
        if tags:
            comment.tags.set(tags)
        return comment

    @staticmethod
    def _derive_location(validated_data) -> dict:
        """入力の verse/chapter/book（いずれか1つ）から箇所と投稿時訳を導出する。"""
        location = derive_location(
            verse=validated_data.get("verse"),
            chapter=validated_data.get("chapter"),
            book=validated_data.get("book"),
        )
        if location is None:
            # validate() でちょうど1つあることを保証済み。ここへは到達しない。
            raise serializers.ValidationError("Specify exactly one of verse, chapter, or book.")
        return location


class CommentEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["body"]

    def validate_body(self, value):
        return _clean_body(value)

    def update(self, instance, validated_data):
        instance.body = validated_data["body"]
        instance.save(update_fields=["body", "updated_at"])
        return instance


class MyCommentSerializer(serializers.ModelSerializer):
    """自分のコメント一覧用。投稿先の書名・章番号に加え、
    プロフィールからその箇所へリンクするための slug/章/節/訳も返す。"""

    user = CommentAuthorSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    location_label = serializers.SerializerMethodField()
    # フロントで箇所リンク（/{slug}/{章}?translation={訳}#verse-{節}）を組み立てるための素材。
    book_slug = serializers.SerializerMethodField()
    # 粒度によって null（書へのコメントなら章も節も、章へのコメントなら節が null）。
    chapter_number = serializers.IntegerField(read_only=True, allow_null=True)
    verse_number = serializers.IntegerField(read_only=True, allow_null=True)
    source_translation = serializers.CharField(read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "user",
            "body",
            "created_at",
            "vote_count",
            "location_label",
            "book_slug",
            "chapter_number",
            "verse_number",
            "source_translation",
        ]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def get_location_label(self, obj) -> str:
        book, chapter, verse = _get_location_parts(obj, book_name_cache(self))
        return _format_location_label(book, chapter, verse)

    def get_book_slug(self, obj) -> str:
        return obj.canonical_book.slug if obj.canonical_book_id else ""


class TrendingCommentSerializer(serializers.ModelSerializer):
    """表紙の「盛り上がっているコメント」用。箇所へ飛べるだけの情報を添える。"""

    user = CommentAuthorSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    location_label = serializers.SerializerMethodField()
    book_name = serializers.SerializerMethodField()
    chapter_number = serializers.SerializerMethodField()
    verse_number = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "user",
            "body",
            "created_at",
            "vote_count",
            "location_label",
            "book_name",
            "chapter_number",
            "verse_number",
            "reply_count",
        ]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def get_reply_count(self, obj) -> int:
        if hasattr(obj, "reply_count"):
            return obj.reply_count
        return obj.replies.filter(is_deleted=False).count()

    def get_book_name(self, obj) -> str:
        book, _, _ = _get_location_parts(obj, book_name_cache(self))
        return book

    def get_chapter_number(self, obj) -> int | None:
        _, chapter, _ = _get_location_parts(obj, book_name_cache(self))
        return chapter

    def get_verse_number(self, obj) -> int | None:
        _, _, verse = _get_location_parts(obj, book_name_cache(self))
        return verse

    def get_location_label(self, obj) -> str:
        book, chapter, verse = _get_location_parts(obj, book_name_cache(self))
        return _format_location_label(book, chapter, verse)


class CommentSearchSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    location = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "body", "username", "created_at", "location"]

    def get_location(self, obj) -> str:
        book, chapter, verse = _get_location_parts(obj, book_name_cache(self))
        # 検索結果では章節を「1章1節」（スペースなし）で表示する
        if verse is not None:
            return f"{book} {chapter}章{verse}節"
        return _format_location_label(book, chapter, verse)


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "reason", "created_at"]
        read_only_fields = ["id", "created_at"]
