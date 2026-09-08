from rest_framework import serializers

from .models import Book, Chapter, Verse


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = ["id", "name", "translation", "order"]


class ChapterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Chapter
        fields = ["id", "book", "number"]


class VerseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Verse
        fields = ["id", "chapter", "number", "text"]


class VerseOfDaySerializer(serializers.ModelSerializer):
    book_name = serializers.CharField(source="chapter.book.name", read_only=True)
    chapter_number = serializers.IntegerField(source="chapter.number", read_only=True)
    translation = serializers.CharField(source="chapter.book.translation", read_only=True)

    class Meta:
        model = Verse
        fields = ["id", "number", "text", "book_name", "chapter_number", "translation"]


class VerseSearchSerializer(serializers.ModelSerializer):
    book_name = serializers.CharField(source="chapter.book.name", read_only=True)
    chapter_number = serializers.IntegerField(source="chapter.number", read_only=True)
    chapter_id = serializers.UUIDField(source="chapter.id", read_only=True)
    book_id = serializers.UUIDField(source="chapter.book.id", read_only=True)
    # 検索は全訳を横断するため、どの訳の本文に当たったかを返す（UI 言語では絞らない）。
    translation = serializers.CharField(source="chapter.book.translation", read_only=True)
    # 訳非依存の書 slug。フロントは book_name の逆引きではなくこれでリンクを組み立てる。
    book_slug = serializers.SerializerMethodField()

    class Meta:
        model = Verse
        fields = ["id", "number", "text", "chapter_number", "chapter_id", "book_name", "book_id", "book_slug", "translation"]

    def get_book_slug(self, obj) -> str:
        cb = obj.chapter.book.canonical_book
        return cb.slug if cb else ""


# ---------------------------------------------------------------------------
# 検索の結果カード
#
# 一覧画面の serializer（ArticleListSerializer など）は使わない。あちらは
# 一覧側の annotate（件数や進捗）に頼っていて、検索から呼ぶと壊れるため。
# 検索の結果に出す項目だけを持つ、軽い serializer をここに置く。
# ---------------------------------------------------------------------------

class ArticleSearchSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    summary = serializers.CharField(read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)


class PlanSearchSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)


class QuestionSearchSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    title = serializers.CharField(read_only=True)
    body = serializers.CharField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)


class ProjectSearchSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    description = serializers.CharField(read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True)
