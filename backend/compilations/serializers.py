from django.db.models import Max
from rest_framework import serializers

from bible.models import Verse
from translations.models import TranslationProject, TranslationUnit
from .models import (
    CompiledBook,
    CompiledChapter,
    CompiledComment,
    CompiledVerse,
    MotifTag,
)


def _clean_text(value: str | None, *, field: str, max_length: int | None = None) -> str:
    if value is None:
        raise serializers.ValidationError({field: "This field is required."})
    cleaned = "".join(
        ch for ch in value if ch in ("\n", "\r", "\t") or ord(ch) >= 0x20 and ch != "\x7f"
    ).strip()
    if not cleaned:
        raise serializers.ValidationError({field: "This field is required."})
    if max_length and len(cleaned) > max_length:
        raise serializers.ValidationError({field: f"Must be {max_length} characters or fewer."})
    return cleaned


def _motifs_from_names(names: list[str]) -> list[MotifTag]:
    motifs: list[MotifTag] = []
    seen: set[str] = set()
    for raw in names:
        name = raw.strip()
        key = name.lower()
        if not name or key in seen:
            continue
        seen.add(key)
        motif, _ = MotifTag.objects.get_or_create(name=name)
        motifs.append(motif)
    return motifs


def _set_motifs(instance, names: list[str] | None) -> None:
    if names is None:
        return
    instance.motifs.set(_motifs_from_names(names))


def _next_order(model, **filters) -> int:
    current = model.objects.filter(**filters).aggregate(max_order=Max("order"))["max_order"]
    return int(current or 0) + 1


def _next_chapter_number(book: CompiledBook) -> int:
    current = CompiledChapter.objects.filter(book=book).aggregate(max_num=Max("number"))["max_num"]
    return int(current or 0) + 1


def _next_verse_number(chapter: CompiledChapter) -> int:
    current = CompiledVerse.objects.filter(chapter=chapter).aggregate(max_num=Max("verse_number"))["max_num"]
    return int(current or 0) + 1


class MotifTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = MotifTag
        fields = ["id", "name", "slug", "description"]
        read_only_fields = ["id", "slug"]


class CompiledCommentAuthorSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    username = serializers.CharField()


class CompiledVerseSerializer(serializers.ModelSerializer):
    motif_tags = MotifTagSerializer(source="motifs", many=True, read_only=True)
    motif_names = serializers.ListField(
        child=serializers.CharField(max_length=40),
        write_only=True,
        required=False,
    )
    source_reference = serializers.SerializerMethodField()
    source_verse = serializers.PrimaryKeyRelatedField(
        queryset=Verse.objects.all(),
        required=False,
        allow_null=True,
    )
    source_translation_unit = serializers.PrimaryKeyRelatedField(
        queryset=TranslationUnit.objects.select_related("project", "verse__chapter__book"),
        required=False,
        allow_null=True,
    )
    source_compiled_verse = serializers.PrimaryKeyRelatedField(
        queryset=CompiledVerse.objects.select_related("book", "chapter"),
        required=False,
        allow_null=True,
    )
    chapter = serializers.PrimaryKeyRelatedField(
        queryset=CompiledChapter.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = CompiledVerse
        fields = [
            "id",
            "book",
            "chapter",
            "verse_number",
            "order",
            "source_kind",
            "source_verse",
            "source_translation_unit",
            "source_compiled_verse",
            "body_snapshot",
            "source_label",
            "source_reference",
            "curator_note",
            "motif_tags",
            "motif_names",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "book", "source_label", "source_reference", "created_at", "updated_at"]
        extra_kwargs = {
            "body_snapshot": {"required": False, "allow_blank": True},
            "curator_note": {"required": False, "allow_blank": True},
            "verse_number": {"required": False, "allow_null": True},
            "order": {"required": False},
        }

    def get_source_reference(self, obj: CompiledVerse) -> dict | None:
        if obj.source_verse_id:
            verse = obj.source_verse
            book = verse.chapter.book
            return {
                "kind": CompiledVerse.SOURCE_BIBLE_VERSE,
                "verse_id": str(verse.id),
                "book_slug": book.canonical_book.slug,
                "book_name": book.name,
                "chapter": verse.chapter.number,
                "verse": verse.number,
                "translation": book.translation,
            }
        if obj.source_translation_unit_id:
            unit = obj.source_translation_unit
            return {
                "kind": CompiledVerse.SOURCE_TRANSLATION_UNIT,
                "unit_id": str(unit.id),
                "project_id": str(unit.project_id),
                "project_name": unit.project.name,
                "chapter": unit.verse.chapter.number,
                "verse": unit.verse.number,
            }
        if obj.source_compiled_verse_id:
            source = obj.source_compiled_verse
            return {
                "kind": CompiledVerse.SOURCE_COMPILED_VERSE,
                "compiled_verse_id": str(source.id),
                "compiled_book_id": str(source.book_id),
                "compiled_book_title": source.book.title,
                "chapter": source.chapter.number if source.chapter_id else None,
                "verse": source.verse_number,
            }
        return {"kind": CompiledVerse.SOURCE_NOTE}

    def validate(self, attrs):
        book = self.context["book"]
        chapter = attrs.get("chapter", getattr(self.instance, "chapter", None))
        if chapter is not None and chapter.book_id != book.id:
            raise serializers.ValidationError({"chapter": "Chapter must belong to this compiled book."})

        source_kind = attrs.get("source_kind")
        source_verse = attrs.get("source_verse", getattr(self.instance, "source_verse", None))
        source_unit = attrs.get("source_translation_unit", getattr(self.instance, "source_translation_unit", None))
        source_compiled = attrs.get("source_compiled_verse", getattr(self.instance, "source_compiled_verse", None))

        if not source_kind:
            if source_verse:
                source_kind = CompiledVerse.SOURCE_BIBLE_VERSE
            elif source_unit:
                source_kind = CompiledVerse.SOURCE_TRANSLATION_UNIT
            elif source_compiled:
                source_kind = CompiledVerse.SOURCE_COMPILED_VERSE
            else:
                source_kind = CompiledVerse.SOURCE_NOTE
            attrs["source_kind"] = source_kind

        provided = [x for x in [source_verse, source_unit, source_compiled] if x is not None]
        if source_kind == CompiledVerse.SOURCE_NOTE:
            if provided:
                raise serializers.ValidationError("Note verses cannot also reference another source.")
            body_value = attrs.get(
                "body_snapshot",
                getattr(self.instance, "body_snapshot", None),
            )
            attrs["body_snapshot"] = _clean_text(body_value, field="body_snapshot", max_length=10000)
        elif source_kind == CompiledVerse.SOURCE_BIBLE_VERSE:
            if source_verse is None or len(provided) != 1:
                raise serializers.ValidationError({"source_verse": "Specify exactly one source verse."})
        elif source_kind == CompiledVerse.SOURCE_TRANSLATION_UNIT:
            if source_unit is None or len(provided) != 1:
                raise serializers.ValidationError({"source_translation_unit": "Specify exactly one translation unit."})
            if source_unit.project.status != TranslationProject.STATUS_PUBLISHED or source_unit.status != TranslationUnit.STATUS_DONE:
                raise serializers.ValidationError({"source_translation_unit": "Only published, done translation units can be compiled."})
        elif source_kind == CompiledVerse.SOURCE_COMPILED_VERSE:
            if source_compiled is None or len(provided) != 1:
                raise serializers.ValidationError({"source_compiled_verse": "Specify exactly one compiled verse."})
            if source_compiled.book.visibility == CompiledBook.VISIBILITY_PRIVATE:
                request = self.context.get("request")
                if not request or source_compiled.book.owner_id != request.user.id:
                    raise serializers.ValidationError({"source_compiled_verse": "This compiled verse is private."})
        else:
            raise serializers.ValidationError({"source_kind": "Unknown source kind."})
        return attrs

    def _snapshot(self, obj: CompiledVerse) -> None:
        if obj.source_kind == CompiledVerse.SOURCE_BIBLE_VERSE:
            verse = obj.source_verse
            book = verse.chapter.book
            obj.body_snapshot = verse.text
            obj.source_label = f"{book.name} {verse.chapter.number}:{verse.number} / {book.translation}"
        elif obj.source_kind == CompiledVerse.SOURCE_TRANSLATION_UNIT:
            unit = obj.source_translation_unit
            obj.body_snapshot = unit.body
            obj.source_label = f"{unit.project.name} {unit.verse.chapter.number}:{unit.verse.number}"
        elif obj.source_kind == CompiledVerse.SOURCE_COMPILED_VERSE:
            source = obj.source_compiled_verse
            obj.body_snapshot = source.body_snapshot
            loc = f" {source.chapter.number}:{source.verse_number}" if source.chapter_id else ""
            obj.source_label = f"{source.book.title}{loc}"
        else:
            obj.source_label = "Original note"

    def create(self, validated_data):
        motif_names = validated_data.pop("motif_names", None)
        book = self.context["book"]
        chapter = validated_data.get("chapter")
        if "order" not in validated_data:
            validated_data["order"] = _next_order(CompiledVerse, book=book, chapter=chapter)
        if chapter and "verse_number" not in validated_data:
            validated_data["verse_number"] = _next_verse_number(chapter)
        verse = CompiledVerse(book=book, **validated_data)
        self._snapshot(verse)
        verse.save()
        _set_motifs(verse, motif_names)
        return verse

    def update(self, instance, validated_data):
        motif_names = validated_data.pop("motif_names", None)
        source_changed = any(
            field in validated_data
            for field in ("source_kind", "source_verse", "source_translation_unit", "source_compiled_verse", "body_snapshot")
        )
        old_chapter_id = instance.chapter_id
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if instance.chapter_id and not instance.verse_number:
            instance.verse_number = _next_verse_number(instance.chapter)
        if old_chapter_id != instance.chapter_id and instance.chapter_id:
            instance.order = _next_order(CompiledVerse, book=instance.book, chapter=instance.chapter)
            instance.verse_number = _next_verse_number(instance.chapter)
        if source_changed:
            self._snapshot(instance)
        instance.save()
        _set_motifs(instance, motif_names)
        return instance


class CompiledChapterSerializer(serializers.ModelSerializer):
    motif_tags = MotifTagSerializer(source="motifs", many=True, read_only=True)
    motif_names = serializers.ListField(
        child=serializers.CharField(max_length=40),
        write_only=True,
        required=False,
    )
    verses = CompiledVerseSerializer(many=True, read_only=True)
    verse_count = serializers.SerializerMethodField()

    class Meta:
        model = CompiledChapter
        fields = [
            "id",
            "book",
            "number",
            "title",
            "introduction",
            "annotation",
            "order",
            "motif_tags",
            "motif_names",
            "verse_count",
            "verses",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "book", "created_at", "updated_at", "verses", "verse_count"]
        extra_kwargs = {
            "number": {"required": False},
            "order": {"required": False},
            "introduction": {"required": False, "allow_blank": True},
            "annotation": {"required": False, "allow_blank": True},
        }

    def get_verse_count(self, obj) -> int:
        return getattr(obj, "verse_count", obj.verses.count())

    def create(self, validated_data):
        motif_names = validated_data.pop("motif_names", None)
        book = self.context["book"]
        if "number" not in validated_data:
            validated_data["number"] = _next_chapter_number(book)
        if "order" not in validated_data:
            validated_data["order"] = _next_order(CompiledChapter, book=book)
        chapter = CompiledChapter.objects.create(book=book, **validated_data)
        _set_motifs(chapter, motif_names)
        return chapter

    def update(self, instance, validated_data):
        motif_names = validated_data.pop("motif_names", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        _set_motifs(instance, motif_names)
        return instance


class CompiledBookSummarySerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    motif_tags = MotifTagSerializer(source="motifs", many=True, read_only=True)
    chapter_count = serializers.SerializerMethodField()
    verse_count = serializers.SerializerMethodField()

    class Meta:
        model = CompiledBook
        fields = [
            "id",
            "title",
            "slug",
            "description",
            "annotation",
            "owner_username",
            "visibility",
            "motif_tags",
            "chapter_count",
            "verse_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "slug", "owner_username", "chapter_count", "verse_count", "created_at", "updated_at"]

    def get_chapter_count(self, obj) -> int:
        return getattr(obj, "chapter_count", obj.chapters.count())

    def get_verse_count(self, obj) -> int:
        return getattr(obj, "verse_count", obj.verses.count())


class CompiledBookDetailSerializer(CompiledBookSummarySerializer):
    motif_names = serializers.ListField(
        child=serializers.CharField(max_length=40),
        write_only=True,
        required=False,
    )
    chapters = CompiledChapterSerializer(many=True, read_only=True)
    tray = serializers.SerializerMethodField()
    forked_from_title = serializers.CharField(source="forked_from.title", read_only=True, allow_null=True)

    class Meta(CompiledBookSummarySerializer.Meta):
        fields = CompiledBookSummarySerializer.Meta.fields + [
            "forked_from",
            "forked_from_title",
            "motif_names",
            "chapters",
            "tray",
        ]
        read_only_fields = CompiledBookSummarySerializer.Meta.read_only_fields + [
            "forked_from_title",
            "chapters",
            "tray",
        ]

    def get_tray(self, obj) -> list[dict]:
        verses = obj.verses.filter(chapter__isnull=True).order_by("order", "created_at")
        return CompiledVerseSerializer(verses, many=True, context=self.context).data

    def create(self, validated_data):
        motif_names = validated_data.pop("motif_names", None)
        validated_data["owner"] = self.context["request"].user
        book = CompiledBook.objects.create(**validated_data)
        _set_motifs(book, motif_names)
        return book

    def update(self, instance, validated_data):
        motif_names = validated_data.pop("motif_names", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        _set_motifs(instance, motif_names)
        return instance


class CompiledCommentSerializer(serializers.ModelSerializer):
    user = CompiledCommentAuthorSerializer(read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=CompiledComment.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = CompiledComment
        fields = ["id", "user", "book", "chapter", "verse", "parent", "body", "is_deleted", "created_at"]
        read_only_fields = ["id", "user", "is_deleted", "created_at"]

    def validate_body(self, value):
        return _clean_text(value, field="body", max_length=5000)

    def validate(self, attrs):
        book = attrs.get("book")
        chapter = attrs.get("chapter")
        verse = attrs.get("verse")
        targets = [x for x in (book, chapter, verse) if x is not None]
        if len(targets) != 1:
            raise serializers.ValidationError("Specify exactly one of book, chapter, or verse.")

        parent = attrs.get("parent")
        if parent:
            same_target = (
                parent.book_id == (book.id if book else None)
                and parent.chapter_id == (chapter.id if chapter else None)
                and parent.verse_id == (verse.id if verse else None)
            )
            if not same_target:
                raise serializers.ValidationError({"parent": "Reply must target the same compiled item."})
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)
