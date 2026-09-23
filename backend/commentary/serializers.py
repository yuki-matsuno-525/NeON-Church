from rest_framework import serializers

from .models import CommentaryChapter, PassageLink, Section, Work

# 節のパネルに出す抜粋の長さ。全文は解釈書のページで読む。
EXCERPT_LENGTH = 280


class ChapterBriefSerializer(serializers.ModelSerializer):
    """解釈書の書のページに並べる章。"""

    section_count = serializers.IntegerField(read_only=True, default=None)

    class Meta:
        model = CommentaryChapter
        fields = ["number", "title", "section_count"]


class WorkSerializer(serializers.ModelSerializer):
    """解釈書の一覧・詳細。出典と権利は必ず一緒に返す（画面に出すため）。"""

    section_count = serializers.IntegerField(read_only=True, default=None)
    chapter_count = serializers.IntegerField(read_only=True, default=None)

    class Meta:
        model = Work
        fields = [
            "slug", "title", "title_ja", "author", "author_ja", "year", "tradition", "language",
            "translator", "source_name", "source_url", "license", "license_note", "readable",
            "section_count", "chapter_count",
        ]


class WorkDetailSerializer(WorkSerializer):
    """解釈書の書のページ用。章の一覧も付ける。"""

    chapters = serializers.SerializerMethodField()

    class Meta(WorkSerializer.Meta):
        fields = WorkSerializer.Meta.fields + ["chapters"]

    def get_chapters(self, obj: Work) -> list[dict]:
        counts: dict[int, int] = {}
        for number in obj.sections.values_list("chapter_number", flat=True):
            counts[number] = counts.get(number, 0) + 1
        return [
            {"number": c.number, "title": c.title, "section_count": counts.get(c.number, 0)}
            for c in obj.chapters.all()
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
    """解釈書の章のページの1区切り（全文）。聖書の節にあたる。"""

    links = PassageLinkSerializer(many=True, read_only=True)

    class Meta:
        model = Section
        fields = ["id", "chapter_number", "number", "heading", "text", "source_url", "links"]


class ChapterDetailSerializer(serializers.ModelSerializer):
    """解釈書の章のページの上の部分（章の題・前後の章・章そのものが論じる箇所）。"""

    work = WorkSerializer(read_only=True)
    links = PassageLinkSerializer(many=True, read_only=True)
    prev_number = serializers.SerializerMethodField()
    next_number = serializers.SerializerMethodField()
    section_count = serializers.SerializerMethodField()

    class Meta:
        model = CommentaryChapter
        fields = ["number", "title", "work", "links", "prev_number", "next_number", "section_count"]

    def get_prev_number(self, obj) -> int | None:
        prev = obj.work.chapters.filter(number__lt=obj.number).order_by("-number").first()
        return prev.number if prev else None

    def get_next_number(self, obj) -> int | None:
        nxt = obj.work.chapters.filter(number__gt=obj.number).order_by("number").first()
        return nxt.number if nxt else None

    def get_section_count(self, obj) -> int:
        return obj.work.sections.filter(chapter_number=obj.number).count()


class PassageEntrySerializer(serializers.Serializer):
    """ある節についての解釈1件（節のパネル用）。

    区切り1つ（number あり）か、章そのもの（number なし。講や巻が箇所を論じるとき）。
    method はその結び付き方のうち一番確かなもの（構造 > 引用 > AI判定）。
    """

    id = serializers.CharField()
    chapter_number = serializers.IntegerField()
    number = serializers.IntegerField(allow_null=True)
    chapter_title = serializers.CharField()
    heading = serializers.CharField()
    excerpt = serializers.CharField()
    truncated = serializers.BooleanField()
    work = WorkBriefSerializer()
    method = serializers.CharField()
    confidence = serializers.FloatField(allow_null=True)
