from django.conf import settings
from django.db import models
from django.utils.text import slugify

from common.models import BaseModel

# 最初に用意する主題タグ（表示名, URL用のslug）。
# 追加は管理者だけが行う（自由入力にすると表記ゆれで散らかるため）。
# slug は日本語からは作れないので、ここで決め打ちする。データ移行 0002 で投入する。
INITIAL_TAGS = [
    ("苦しみ", "suffering"),
    ("死と復活", "death-and-resurrection"),
    ("愛", "love"),
    ("お金と施し", "money-and-giving"),
    ("祈り", "prayer"),
    ("断食", "fasting"),
    ("ゆるし", "forgiveness"),
    ("律法", "law"),
    ("罪", "sin"),
    ("救い", "salvation"),
    ("終末", "end-times"),
    ("天使と悪魔", "angels-and-demons"),
    ("夢と幻", "dreams-and-visions"),
    ("女性", "women"),
    ("食べもの", "food"),
]

# 1つの記事に付けられるタグの上限。多すぎると絞り込みが機能しなくなる。
MAX_TAGS_PER_ARTICLE = 3


class ArticleTag(BaseModel):
    """記事の主題タグ（「祈り」「断食」など）。"""

    name = models.CharField(max_length=40, unique=True)
    slug = models.SlugField(max_length=80, unique=True)

    class Meta:
        db_table = "article_tags"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        # 日本語のタグ名から slugify で作れる文字列は空になるため、id の先頭を足して一意にする。
        if not self.slug:
            base = slugify(self.name) or "tag"
            self.slug = f"{base}-{str(self.id)[:8]}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Article(BaseModel):
    """
    記事。節を引用しながら書く1ページ完結の文章。

    本文（body）は Markdown ＋ 引用の印。印の書式は citations.py を参照。
    body が正本で、ArticleCitation は保存のたびに body から作り直す索引。
    """

    VISIBILITY_PRIVATE = "private"
    VISIBILITY_UNLISTED = "unlisted"
    VISIBILITY_PUBLIC = "public"
    VISIBILITY_CHOICES = [
        (VISIBILITY_PRIVATE, "Private"),
        (VISIBILITY_UNLISTED, "Unlisted"),
        (VISIBILITY_PUBLIC, "Public"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="articles",
    )
    title = models.CharField(max_length=200)
    # 一覧に出す短い説明。本文の冒頭は引用の印を含みうるので自動では作れない。
    # 公開するときは必須（serializer で検証する）。下書きのうちは空でよい。
    summary = models.CharField(max_length=300, blank=True)
    body = models.TextField(blank=True)
    visibility = models.CharField(
        max_length=12,
        choices=VISIBILITY_CHOICES,
        default=VISIBILITY_PRIVATE,
        db_index=True,
    )
    tags = models.ManyToManyField(ArticleTag, blank=True, related_name="articles")

    class Meta:
        db_table = "articles"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class ArticleCitation(BaseModel):
    """
    記事の中の引用1つ。本文の印を読み取って作る索引で、直接編集はしない。

    これがあるので「この節を引用した記事」を節の側から引ける。
    箇所は訳非依存（canonical_book + 章番号 + 節番号）で持ち、お気に入りと同じ形になる。
    """

    KIND_INLINE = "inline"
    KIND_BLOCK = "block"
    KIND_CHOICES = [
        (KIND_INLINE, "Inline reference"),
        (KIND_BLOCK, "Block quote"),
    ]

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="citations",
    )
    # 本文に書かれている印そのもの（例: "[[matthew 6:16-18]]"）。
    # フロントはこの文字列を目印に本文を置き換えるので、括弧まで含めて持つ。
    raw = models.CharField(max_length=120)
    kind = models.CharField(max_length=8, choices=KIND_CHOICES)
    canonical_book = models.ForeignKey(
        "bible.CanonicalBook",
        on_delete=models.PROTECT,
        related_name="article_citations",
    )
    chapter_number = models.PositiveSmallIntegerField()
    # 節の範囲。両方 NULL なら章まるごとへの参照。
    # 1節だけのときは start と end に同じ番号が入る。
    verse_number_start = models.PositiveSmallIntegerField(null=True, blank=True)
    verse_number_end = models.PositiveSmallIntegerField(null=True, blank=True)
    # 訳の指定（Book.translation の値）。空なら読む人の訳にまかせる。
    translation = models.CharField(max_length=50, blank=True)
    # 本文に出てくる順番（同じ印が2回出てきたら最初の位置）。
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "article_citations"
        ordering = ["order"]
        indexes = [
            # 節の側から記事を引くための索引。
            models.Index(
                fields=["canonical_book", "chapter_number", "verse_number_start"],
                name="article_citation_location",
            ),
        ]
        constraints = [
            # 同じ印は記事ごとに1行だけ持つ（本文に2回出てきてもまとめる）。
            models.UniqueConstraint(fields=["article", "raw"], name="unique_article_citation_raw"),
        ]

    def __str__(self) -> str:
        return f"{self.article.title} {self.raw}"


class ArticleComment(BaseModel):
    """
    記事へのコメント。記事全体に対してのみ付く（記事の中の節には付かない）。
    論理削除で、本文をクリアせず is_deleted で隠す（返信の親を保つため）。
    """

    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="article_comments",
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
        db_table = "article_comments"
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.article.title} へのコメント"
