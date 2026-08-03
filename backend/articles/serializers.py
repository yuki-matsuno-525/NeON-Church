from rest_framework import serializers

from .citations import resolve_citations
from .models import MAX_TAGS_PER_ARTICLE, Article, ArticleComment, ArticleTag

# 本文の上限。長文を想定しつつ、際限なく太らないように上限は置く。
BODY_MAX_LENGTH = 60000
COMMENT_MAX_LENGTH = 5000


def _clean_text(value: str, max_length: int, field_name: str) -> str:
    """
    保存前に文字列を整える。改行・タブ以外の制御文字を落とし、長さを確かめる。
    comments/serializers.py の _clean_body と同じ考え方。
    """
    cleaned = "".join(
        ch for ch in value if ch in ("\n", "\r", "\t") or (ord(ch) >= 0x20 and ch != "\x7f")
    ).strip()
    if len(cleaned) > max_length:
        raise serializers.ValidationError(f"{field_name}は{max_length}文字までです。")
    return cleaned


class ArticleTagSerializer(serializers.ModelSerializer):
    # 一覧では公開記事の数を添えて返す（0件のタグは view 側で除く）。
    article_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ArticleTag
        fields = ["id", "name", "slug", "article_count"]


class ArticleListSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    tags = ArticleTagSerializer(many=True, read_only=True)

    class Meta:
        model = Article
        fields = [
            "id",
            "title",
            "summary",
            "visibility",
            "owner_username",
            "tags",
            "created_at",
            "updated_at",
        ]


class ArticleDetailSerializer(ArticleListSerializer):
    # 本文の印を画面に出せる形へ解決したもの。フロントは raw を目印に本文を置き換える。
    citations = serializers.SerializerMethodField()

    class Meta(ArticleListSerializer.Meta):
        fields = ArticleListSerializer.Meta.fields + ["body", "citations"]

    def get_citations(self, obj) -> list[dict]:
        return resolve_citations(obj.citations.select_related("canonical_book"))


class ArticleWriteSerializer(serializers.ModelSerializer):
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=ArticleTag.objects.all(),
        source="tags",
        required=False,
    )
    # 保存の返事にも引用を載せる。編集画面のプレビューが、保存のたびに最新の見え方へ
    # 追いつけるようにするため（もう一度取り直さなくてよい）。
    citations = serializers.SerializerMethodField()

    class Meta:
        model = Article
        fields = ["id", "title", "summary", "body", "visibility", "tag_ids", "citations"]

    def get_citations(self, obj) -> list[dict]:
        return resolve_citations(obj.citations.select_related("canonical_book"))

    def validate_title(self, value: str) -> str:
        cleaned = _clean_text(value, 200, "題")
        if not cleaned:
            raise serializers.ValidationError("題を入れてください。")
        return cleaned

    def validate_summary(self, value: str) -> str:
        return _clean_text(value, 300, "要約")

    def validate_body(self, value: str) -> str:
        return _clean_text(value, BODY_MAX_LENGTH, "本文")

    def validate_tag_ids(self, value: list) -> list:
        if len(value) > MAX_TAGS_PER_ARTICLE:
            raise serializers.ValidationError(
                f"タグは{MAX_TAGS_PER_ARTICLE}つまでです。"
            )
        return value

    def validate(self, attrs: dict) -> dict:
        # 要約が空のままでは公開できない（一覧が題だけの寂しい見た目になるため）。
        visibility = attrs.get("visibility", getattr(self.instance, "visibility", Article.VISIBILITY_PRIVATE))
        summary = attrs.get("summary", getattr(self.instance, "summary", ""))
        if visibility != Article.VISIBILITY_PRIVATE and not summary:
            raise serializers.ValidationError({"summary": "公開するには要約を入れてください。"})
        return attrs


class ArticleCommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    body = serializers.CharField()

    class Meta:
        model = ArticleComment
        fields = ["id", "username", "body", "parent", "is_deleted", "created_at"]
        read_only_fields = ["is_deleted", "created_at"]

    def validate_body(self, value: str) -> str:
        cleaned = _clean_text(value, COMMENT_MAX_LENGTH, "コメント")
        if not cleaned:
            raise serializers.ValidationError("コメントを入れてください。")
        return cleaned

    def validate_parent(self, value):
        # 返信先は同じ記事のコメントに限る。
        article = self.context.get("article")
        if value is not None and article is not None and value.article_id != article.id:
            raise serializers.ValidationError("この記事のコメントではありません。")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_deleted:
            data["body"] = ""
        return data
