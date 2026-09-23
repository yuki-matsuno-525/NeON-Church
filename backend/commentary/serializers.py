from rest_framework import serializers

from .models import PassageLink, Section, Work

# 節のパネルに出す抜粋の長さ。全文は解釈書のページで読む。
EXCERPT_LENGTH = 280


class WorkSerializer(serializers.ModelSerializer):
    """解釈書の一覧・詳細。出典と権利は必ず一緒に返す（画面に出すため）。"""

    section_count = serializers.IntegerField(read_only=True, default=None)

    class Meta:
        model = Work
        fields = [
            "slug", "title", "title_ja", "author", "author_ja", "year", "tradition", "language",
            "translator", "source_name", "source_url", "license", "license_note", "readable",
            "section_count",
        ]


class WorkBriefSerializer(serializers.ModelSerializer):
    """節のパネルで区切りに添える、本の短い情報。"""

    class Meta:
        model = Work
        fields = ["slug", "title", "title_ja", "author", "author_ja", "year", "tradition", "language"]


class PassageLinkSerializer(serializers.ModelSerializer):
    book = serializers.CharField(source="canonical_book.slug", read_only=True)

    class Meta:
        model = PassageLink
        fields = ["book", "chapter", "verse", "chapter_end", "verse_end", "method", "confidence"]


class SectionSerializer(serializers.ModelSerializer):
    """解釈書を読むページの1区切り（全文）。"""

    links = PassageLinkSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ["id", "order", "heading", "text", "source_url", "links"]


class PassageEntrySerializer(serializers.ModelSerializer):
    """ある節についての解釈1件（節のパネル用）。

    method はその区切りと節の結び付き方のうち一番確かなもの（構造 > 引用 > AI判定）。
    """

    work = WorkBriefSerializer(read_only=True)
    excerpt = serializers.SerializerMethodField()
    truncated = serializers.SerializerMethodField()
    method = serializers.CharField(read_only=True)
    confidence = serializers.FloatField(read_only=True, allow_null=True)

    class Meta:
        model = Section
        fields = ["id", "order", "heading", "excerpt", "truncated", "work", "method", "confidence"]

    def get_excerpt(self, obj: Section) -> str:
        return obj.text[:EXCERPT_LENGTH]

    def get_truncated(self, obj: Section) -> bool:
        return len(obj.text) > EXCERPT_LENGTH
