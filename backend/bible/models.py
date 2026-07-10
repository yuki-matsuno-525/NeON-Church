from django.db import models

from common.models import BaseModel


class CanonicalBook(BaseModel):
    """
    訳非依存の「書」。同じ書の複数訳（口語訳マタイ／KJV Matthew／ギリシャ語…）を
    束ねるためだけの最小エンティティ。責務は slug の1つだけ。

    表示順・表示名・ジャンルなどは持たせない（順序は当面 frontend の books.ts が持つ）。
    """

    slug = models.SlugField(unique=True)

    class Meta:
        db_table = "canonical_books"

    def __str__(self) -> str:
        return self.slug


class Book(BaseModel):
    """
    書（例: マタイによる福音書）。
    複数翻訳を収容できるよう (name, translation) に複合ユニーク制約を設ける。
    同じ書の各訳は canonical_book で1つに束ねる（段階3で全件リンク後 NOT NULL 化予定）。
    """

    # 訳非依存の書への参照。段階2では未投入のため nullable。
    canonical_book = models.ForeignKey(
        CanonicalBook,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="editions",
    )
    name = models.CharField(max_length=100)
    translation = models.CharField(max_length=50)
    # 画面表示順（インポート時にファイルのソート順で設定）
    order = models.PositiveSmallIntegerField()

    class Meta:
        db_table = "books"
        unique_together = [("name", "translation")]
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.name}（{self.translation}）"


class Chapter(BaseModel):
    """章。"""

    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="chapters")
    number = models.PositiveSmallIntegerField()

    class Meta:
        db_table = "chapters"
        unique_together = [("book", "number")]
        ordering = ["number"]

    def __str__(self) -> str:
        return f"{self.book.name} 第{self.number}章"


class Verse(BaseModel):
    """節。"""

    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name="verses")
    number = models.PositiveSmallIntegerField()
    text = models.TextField()

    class Meta:
        db_table = "verses"
        unique_together = [("chapter", "number")]
        ordering = ["number"]

    def __str__(self) -> str:
        return f"{self.chapter} {self.number}節"
