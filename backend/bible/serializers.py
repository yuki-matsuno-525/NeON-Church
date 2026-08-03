from rest_framework import serializers

from comments.serializers import CommentSearchSerializer

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
        fields = [
            "id",
            "number",
            "text",
            "chapter_number",
            "chapter_id",
            "book_name",
            "book_id",
            "book_slug",
            "translation",
        ]

    def get_book_slug(self, obj) -> str:
        cb = obj.chapter.book.canonical_book
        return cb.slug if cb else ""


# ---------------------------------------------------------------------------
# 複合レスポンスの宣言
#
# 下のシリアライザは保存にも検証にも使わない。読書画面向けに複数のモデルを
# 1回で返すエンドポイントがあり、その戻り値の形をスキーマへ出すためだけに置く。
# ---------------------------------------------------------------------------


class ReferenceSerializer(serializers.Serializer):
    """どの箇所についての応答かを表す。粒度に応じて章・節は省かれる。"""

    book = serializers.CharField(help_text="正典書の slug")
    chapter = serializers.IntegerField(required=False)
    verse = serializers.IntegerField(required=False)


class TranslationIdSerializer(serializers.Serializer):
    """「この訳ではこの id」の対応。訳の切り替えで使う。"""

    id = serializers.UUIDField()
    translation = serializers.CharField()


class ReferenceBooksResponseSerializer(serializers.Serializer):
    reference = ReferenceSerializer()
    books = TranslationIdSerializer(many=True)


class ReferenceChaptersResponseSerializer(serializers.Serializer):
    reference = ReferenceSerializer()
    chapters = TranslationIdSerializer(many=True)


class ReferenceVersesResponseSerializer(serializers.Serializer):
    reference = ReferenceSerializer()
    verses = TranslationIdSerializer(many=True)


class ReferenceBookReadResponseSerializer(serializers.Serializer):
    """書のページ（章番号のグリッド）に必要なものを1回で返す。"""

    reference = ReferenceSerializer()
    book = BookSerializer()
    chapters = ChapterSerializer(many=True)


class ReferenceReadResponseSerializer(serializers.Serializer):
    """読書画面が1章を表示するのに必要なものを1回で返す。"""

    reference = ReferenceSerializer()
    book = BookSerializer()
    chapter = ChapterSerializer()
    verses = VerseSerializer(many=True)


class SearchResponseSerializer(serializers.Serializer):
    """検索結果。verses だけページングし、books / comments は先頭のプレビュー。"""

    verses = VerseSearchSerializer(many=True)
    books = BookSerializer(many=True)
    comments = CommentSearchSerializer(many=True)
    verse_total = serializers.IntegerField()
    has_more = serializers.BooleanField()
