"""解釈書（教父の注解・ユダヤ教の注解・無教会の講義など）。

聖書本文（bible アプリ）とは別に持つ。解釈書は「頭から読める本」でもあり、
「ある節についての解釈」の集まりでもあるので、次の3段で表す。

    Work（1冊の解釈書）
      └ Section（本文の区切り。段落・講・1つの注解）
          └ PassageLink（その区切りが解釈している聖書の箇所）

どの節にどの解釈があるかは PassageLink で引く。箇所は他アプリと同じく
訳非依存の CanonicalBook ＋ 章 ＋ 節で持つ（bible/passage.py 参照）。
"""

from django.db import models

from common.models import BaseModel


class Work(BaseModel):
    """1冊の解釈書。出典と権利をここに必ず書く。"""

    class Tradition(models.TextChoices):
        JEWISH = "jewish", "ユダヤ教"
        PATRISTIC = "patristic", "教父"
        MEDIEVAL = "medieval", "中世"
        REFORMATION = "reformation", "宗教改革"
        MUKYOKAI = "mukyokai", "無教会"

    class License(models.TextChoices):
        PUBLIC_DOMAIN = "public-domain", "パブリックドメイン"
        CC0 = "cc0", "CC0"
        CC_BY = "cc-by", "CC BY"
        CC_BY_SA = "cc-by-sa", "CC BY-SA"
        CC_BY_NC = "cc-by-nc", "CC BY-NC"

    slug = models.SlugField(max_length=100, unique=True)
    title = models.CharField(max_length=300)
    title_ja = models.CharField(max_length=300, blank=True)
    author = models.CharField(max_length=200)
    author_ja = models.CharField(max_length=200, blank=True)
    # 成立年（おおよそ）。並べ替えと「いつの解釈か」の表示に使う。紀元前は負の数。
    year = models.SmallIntegerField(null=True, blank=True)
    tradition = models.CharField(max_length=20, choices=Tradition.choices)
    # 本文の言語（en / ja）。原典の言語ではなく、ここに入っている本文の言語。
    language = models.CharField(max_length=8)
    translator = models.CharField(max_length=300, blank=True)
    source_name = models.CharField(max_length=300)
    source_url = models.URLField(max_length=500)
    license = models.CharField(max_length=20, choices=License.choices)
    license_note = models.TextField(blank=True)
    # True = 頭から通して読める本。False = 節ごとの注解を集めた抜粋集（通読には向かない）。
    readable = models.BooleanField(default=True)

    class Meta:
        db_table = "commentary_works"
        ordering = ["year", "slug"]

    def __str__(self) -> str:
        return self.title_ja or self.title


class Section(BaseModel):
    """解釈書の本文の区切り。order 順に並べると本が頭から読める。"""

    work = models.ForeignKey(Work, on_delete=models.CASCADE, related_name="sections")
    order = models.PositiveIntegerField()
    heading = models.CharField(max_length=500, blank=True)
    text = models.TextField()
    # 区切りごとに元の場所が分かるときだけ入れる（抜粋集では抜粋ごとに出典が違う）。
    source_url = models.URLField(max_length=500, blank=True)

    class Meta:
        db_table = "commentary_sections"
        unique_together = [("work", "order")]
        ordering = ["order"]

    def __str__(self) -> str:
        return f"{self.work} #{self.order}"


class PassageLink(BaseModel):
    """ある区切りが、聖書のどの箇所を解釈しているか。

    範囲は (chapter, verse) から (chapter_end, verse_end) まで。
    verse が空なら章全体、chapter も空なら書全体を指す。
    """

    class Method(models.TextChoices):
        # 本の作りそのものが節ごと（注解の見出しが節、講義の題が箇所など）
        STRUCTURE = "structure", "構造"
        # 本文や脚注に「何章何節」と書かれている
        CITATION = "citation", "引用"
        # 節が書かれていない箇所を AI が推定した。画面では必ず「AI判定」と明記する
        AI = "ai", "AI判定"

    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="links")
    canonical_book = models.ForeignKey(
        "bible.CanonicalBook", on_delete=models.PROTECT, related_name="commentary_links"
    )
    chapter = models.PositiveSmallIntegerField(null=True, blank=True)
    verse = models.PositiveSmallIntegerField(null=True, blank=True)
    chapter_end = models.PositiveSmallIntegerField(null=True, blank=True)
    verse_end = models.PositiveSmallIntegerField(null=True, blank=True)
    method = models.CharField(max_length=10, choices=Method.choices)
    # AI 判定の確からしさ（0〜1）。構造・引用では空。
    confidence = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "commentary_passage_links"
        indexes = [
            # 「この節の解釈」を引く経路。
            models.Index(
                fields=["canonical_book", "chapter", "verse"], name="commentary_link_loc_idx"
            ),
        ]
        constraints = [
            models.CheckConstraint(
                name="commentary_link_ai_has_confidence",
                condition=~models.Q(method="ai") | models.Q(confidence__isnull=False),
            ),
        ]

    def __str__(self) -> str:
        return f"{self.canonical_book} {self.chapter}:{self.verse} ({self.method})"
