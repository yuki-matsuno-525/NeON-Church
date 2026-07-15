from django.conf import settings
from django.db import models
from django.utils.text import slugify

from common.models import BaseModel


class MotifTag(BaseModel):
    name = models.CharField(max_length=40, unique=True)
    slug = models.SlugField(max_length=80, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "motif_tags"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or "motif"
            self.slug = f"{base}-{str(self.id)[:8]}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class CompiledBook(BaseModel):
    VISIBILITY_PRIVATE = "private"
    VISIBILITY_UNLISTED = "unlisted"
    VISIBILITY_PUBLIC = "public"
    VISIBILITY_CHOICES = [
        (VISIBILITY_PRIVATE, "Private"),
        (VISIBILITY_UNLISTED, "Unlisted"),
        (VISIBILITY_PUBLIC, "Public"),
    ]

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=240, unique=True, blank=True)
    description = models.TextField(blank=True)
    annotation = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="compiled_books",
    )
    visibility = models.CharField(
        max_length=12,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PRIVATE,
        db_index=True,
    )
    forked_from = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="forks",
    )
    motifs = models.ManyToManyField(MotifTag, blank=True, related_name="compiled_books")

    class Meta:
        db_table = "compiled_books"
        ordering = ["-updated_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title) or "compiled-book"
            self.slug = f"{base}-{str(self.id)[:8]}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class CompiledChapter(BaseModel):
    book = models.ForeignKey(
        CompiledBook,
        on_delete=models.CASCADE,
        related_name="chapters",
    )
    number = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=200, blank=True)
    introduction = models.TextField(blank=True)
    annotation = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    motifs = models.ManyToManyField(MotifTag, blank=True, related_name="compiled_chapters")

    class Meta:
        db_table = "compiled_chapters"
        ordering = ["order", "number"]
        constraints = [
            models.UniqueConstraint(fields=["book", "number"], name="unique_compiled_chapter_number"),
        ]

    def __str__(self) -> str:
        return f"{self.book.title} {self.number}"


class CompiledVerse(BaseModel):
    SOURCE_BIBLE_VERSE = "bible_verse"
    SOURCE_TRANSLATION_UNIT = "translation_unit"
    SOURCE_COMPILED_VERSE = "compiled_verse"
    SOURCE_NOTE = "note"
    SOURCE_CHOICES = [
        (SOURCE_BIBLE_VERSE, "Bible verse"),
        (SOURCE_TRANSLATION_UNIT, "Translation unit"),
        (SOURCE_COMPILED_VERSE, "Compiled verse"),
        (SOURCE_NOTE, "Note"),
    ]

    book = models.ForeignKey(
        CompiledBook,
        on_delete=models.CASCADE,
        related_name="verses",
    )
    chapter = models.ForeignKey(
        CompiledChapter,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="verses",
    )
    verse_number = models.PositiveSmallIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    source_kind = models.CharField(max_length=24, choices=SOURCE_CHOICES, default=SOURCE_BIBLE_VERSE)
    source_verse = models.ForeignKey(
        "bible.Verse",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="compiled_occurrences",
    )
    source_translation_unit = models.ForeignKey(
        "translations.TranslationUnit",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="compiled_occurrences",
    )
    source_compiled_verse = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="compiled_occurrences",
    )
    body_snapshot = models.TextField()
    source_label = models.CharField(max_length=240, blank=True)
    curator_note = models.TextField(blank=True)
    motifs = models.ManyToManyField(MotifTag, blank=True, related_name="compiled_verses")

    class Meta:
        db_table = "compiled_verses"
        ordering = ["chapter__order", "order", "created_at"]

    def __str__(self) -> str:
        loc = f"{self.chapter.number}:{self.verse_number}" if self.chapter_id else "tray"
        return f"{self.book.title} {loc}"


class CompiledComment(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="compiled_comments",
    )
    book = models.ForeignKey(
        CompiledBook,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    chapter = models.ForeignKey(
        CompiledChapter,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    verse = models.ForeignKey(
        CompiledVerse,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    body = models.TextField(max_length=5000)
    is_deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        db_table = "compiled_comments"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (
                        models.Q(book__isnull=False)
                        & models.Q(chapter__isnull=True)
                        & models.Q(verse__isnull=True)
                    )
                    | (
                        models.Q(book__isnull=True)
                        & models.Q(chapter__isnull=False)
                        & models.Q(verse__isnull=True)
                    )
                    | (
                        models.Q(book__isnull=True)
                        & models.Q(chapter__isnull=True)
                        & models.Q(verse__isnull=False)
                    )
                ),
                name="compiled_comment_single_target",
            ),
        ]
