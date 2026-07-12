from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Comment, DELETED_COMMENT_BODY, Report, Tag

User = get_user_model()

# 投稿本文の上限。models.Comment.body の max_length=5000 と合わせる。
# DB 制約より手前で弾くことで、サーバーエラーではなくフィールド単位のエラーを返す。
_BODY_MAX_LENGTH = 5000


def _clean_body(value: str | None) -> str:
    """コメント本文を保存前に整える。

    - None / 全空白は ValidationError
    - NULL バイト等の制御文字を除去（ログ・通知メール埋め込み時の事故を防ぐ）
    - 上限長を超える場合は ValidationError
    """
    if value is None:
        raise serializers.ValidationError("Body is required.")
    # 改行・タブ以外の制御文字（U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F）を削除
    cleaned = "".join(
        ch for ch in value if ch in ("\n", "\r", "\t") or ord(ch) >= 0x20 and ch != "\x7f"
    )
    cleaned = cleaned.strip()
    if not cleaned:
        raise serializers.ValidationError("Body is required.")
    if len(cleaned) > _BODY_MAX_LENGTH:
        raise serializers.ValidationError(
            f"Body must be {_BODY_MAX_LENGTH} characters or fewer."
        )
    return cleaned


# ---------------------------------------------------------------------------
# 位置情報ヘルパー
# ---------------------------------------------------------------------------

def _get_location_parts(obj: Comment) -> tuple[str, int | None, int | None]:
    """コメントの書名・章番号・節番号を返す。

    verse / chapter / book のいずれかが FK で紐づく構造に対応する。
    返り値: (book_name, chapter_number_or_None, verse_number_or_None)
    """
    if obj.verse_id and obj.verse:
        v = obj.verse
        return v.chapter.book.name, v.chapter.number, v.number
    if obj.chapter_id and obj.chapter:
        ch = obj.chapter
        return ch.book.name, ch.number, None
    if obj.book_id and obj.book:
        return obj.book.name, None, None
    return "", None, None


def _get_version_label(obj: Comment) -> str:
    """コメントがどのバージョンのものかを表すラベルを返す。

    翻訳プロジェクト向けならプロジェクト名、聖書本体なら訳名（口語訳・KJV など）。
    「全バージョン表示」でどの版のコメントかをバッジ表示するために使う。
    """
    if obj.translation_project_id and obj.translation_project:
        return obj.translation_project.name
    if obj.verse_id and obj.verse:
        return obj.verse.chapter.book.translation
    if obj.chapter_id and obj.chapter:
        return obj.chapter.book.translation
    if obj.book_id and obj.book:
        return obj.book.translation
    return ""


def _format_location_label(book: str, chapter: int | None, verse: int | None) -> str:
    """書名・章番号・節番号を「マタイ 1章 1節」形式の文字列にする。"""
    if verse is not None:
        return f"{book} {chapter}章 {verse}節"
    if chapter is not None:
        return f"{book} {chapter}章"
    return book


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
    version_label = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(), many=True, write_only=True, required=False, source="tags"
    )

    class Meta:
        model = Comment
        fields = ["id", "user", "verse", "chapter", "book", "translation_project", "version_label", "parent", "title", "body", "is_qa", "is_deleted", "created_at", "vote_count", "tags", "tag_ids"]
        read_only_fields = ["id", "user", "is_deleted", "created_at", "vote_count", "version_label", "tags"]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

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
        is_qa = data.get("is_qa", False)

        targets = [x for x in [verse, chapter, book] if x is not None]
        # Q&A または返信は場所なしを許可（通常コメントは必ず1つ）
        if not parent and not is_qa:
            if len(targets) != 1:
                raise serializers.ValidationError(
                    "Specify exactly one of verse, chapter, or book."
                )
        elif len(targets) > 1:
            raise serializers.ValidationError(
                "Specify at most one of verse, chapter, or book."
            )

        # Q&A質問（parent=None, is_qa=True）はタイトル必須
        if is_qa and not parent:
            title = data.get("title", "").strip()
            if not title:
                raise serializers.ValidationError({"title": "A title is required for Q&A questions."})

        if parent:
            if verse and parent.verse_id != verse.pk:
                raise serializers.ValidationError(
                    {"parent": "Reply must target the same verse."}
                )
            elif chapter and parent.chapter_id != chapter.pk:
                raise serializers.ValidationError(
                    {"parent": "Reply must target the same chapter."}
                )
            elif book and parent.book_id != book.pk:
                raise serializers.ValidationError(
                    {"parent": "Reply must target the same book."}
                )
            # 返信は親と同じバージョン（翻訳プロジェクト／聖書本体）に必ず属させる。
            data["translation_project"] = parent.translation_project

        return data

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        validated_data["user"] = self.context["request"].user
        # 段階6C: 旧ターゲット FK（verse/chapter/book）を維持したまま、訳非依存の箇所と投稿時訳も
        # 同時に保存する（dual-write）。値はクライアント入力を信用せず、保存対象の旧 FK から
        # サーバー側で導出する（4フィールドは serializer の入力フィールドではない）。
        # 返信も返信自身の旧 FK から導出する（親からの継承はしない）。
        validated_data.update(self._derive_location(validated_data))
        comment = super().create(validated_data)
        if tags:
            comment.tags.set(tags)
        return comment

    @staticmethod
    def _derive_location(validated_data) -> dict:
        """保存対象の旧 FK（verse/chapter/book）から箇所と投稿時訳を導出する。

        いずれの粒度にも該当しなければ（ターゲット無し）空 dict を返し、箇所列は NULL のまま。
        source_translation は Book.translation の値をそのまま保存する（加工しない）。
        """
        verse = validated_data.get("verse")
        chapter = validated_data.get("chapter")
        book = validated_data.get("book")
        if verse is not None:
            b = verse.chapter.book
            return {
                "canonical_book": b.canonical_book,
                "chapter_number": verse.chapter.number,
                "verse_number": verse.number,
                "source_translation": b.translation,
            }
        if chapter is not None:
            b = chapter.book
            return {
                "canonical_book": b.canonical_book,
                "chapter_number": chapter.number,
                "verse_number": None,
                "source_translation": b.translation,
            }
        if book is not None:
            return {
                "canonical_book": book.canonical_book,
                "chapter_number": None,
                "verse_number": None,
                "source_translation": book.translation,
            }
        return {}


class CommentEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["title", "body"]

    def validate_body(self, value):
        return _clean_body(value)

    def update(self, instance, validated_data):
        instance.body = validated_data["body"]
        if "title" in validated_data:
            instance.title = validated_data["title"]
        instance.save(update_fields=["title", "body", "updated_at"])
        return instance


class MyCommentSerializer(serializers.ModelSerializer):
    """自分のコメント一覧用。投稿先の書名・章番号を含む。"""

    user = CommentAuthorSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    location_label = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "user", "body", "created_at", "vote_count", "location_label"]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def get_location_label(self, obj) -> str:
        book, chapter, verse = _get_location_parts(obj)
        return _format_location_label(book, chapter, verse)


class BestAnswerSerializer(serializers.ModelSerializer):
    user = CommentAuthorSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "user", "body", "created_at"]


class QACommentSerializer(serializers.ModelSerializer):
    user = CommentAuthorSerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    tags = TagSerializer(many=True, read_only=True)
    location_label = serializers.SerializerMethodField()
    book_name = serializers.SerializerMethodField()
    chapter_number = serializers.SerializerMethodField()
    verse_number = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    best_answer = BestAnswerSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id", "user", "title", "body", "created_at", "vote_count",
            "tags", "location_label", "book_name", "chapter_number", "verse_number",
            "reply_count", "best_answer",
        ]

    def get_vote_count(self, obj) -> int:
        return getattr(obj, "vote_count", 0)

    def get_reply_count(self, obj) -> int:
        if hasattr(obj, "reply_count"):
            return obj.reply_count
        return obj.replies.filter(is_deleted=False).count()

    def get_book_name(self, obj) -> str:
        book, _, _ = _get_location_parts(obj)
        return book

    def get_chapter_number(self, obj) -> int | None:
        _, chapter, _ = _get_location_parts(obj)
        return chapter

    def get_verse_number(self, obj) -> int | None:
        _, _, verse = _get_location_parts(obj)
        return verse

    def get_location_label(self, obj) -> str:
        book, chapter, verse = _get_location_parts(obj)
        return _format_location_label(book, chapter, verse)


class CommentSearchSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    location = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "body", "username", "created_at", "location"]

    def get_location(self, obj) -> str:
        book, chapter, verse = _get_location_parts(obj)
        # 検索結果では章節を「1章1節」（スペースなし）で表示する
        if verse is not None:
            return f"{book} {chapter}章{verse}節"
        return _format_location_label(book, chapter, verse)


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "reason", "created_at"]
        read_only_fields = ["id", "created_at"]
