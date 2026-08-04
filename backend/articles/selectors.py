"""記事の読み出し。

公開・限定公開・下書きの見え方の違いがここに集まる。書き込みは services.py。
"""

from django.db.models import Count, Q, QuerySet

from .models import Article, ArticleComment, ArticleTag


def visible_articles(user) -> QuerySet:
    """その人が見てよい記事。公開は誰でも、下書き・限定公開は書いた人だけ。"""
    visible = Q(visibility=Article.VISIBILITY_PUBLIC)
    if user and user.is_authenticated:
        visible |= Q(owner=user)
    return Article.objects.filter(visible)


def list_articles(user, params) -> QuerySet:
    """一覧。既定は公開記事だけ（限定公開は URL を知っている人だけが見る）。"""
    if params.get("mine") == "true" and user.is_authenticated:
        queryset = Article.objects.filter(owner=user)
    else:
        queryset = Article.objects.filter(visibility=Article.VISIBILITY_PUBLIC)
        if params.get("exclude_mine") == "true" and user.is_authenticated:
            queryset = queryset.exclude(owner=user)

    tag_slug = params.get("tag")
    if tag_slug:
        queryset = queryset.filter(tags__slug=tag_slug)

    # プロフィールの記事タブで使う。公開記事だけが対象なので、下書きは漏れない。
    author = params.get("author")
    if author:
        queryset = queryset.filter(owner__username=author)

    return queryset.select_related("owner").prefetch_related("tags").distinct()


def articles_with_citations() -> QuerySet:
    """詳細取得用。引用先の書まで先読みする。"""
    return Article.objects.select_related("owner").prefetch_related(
        "tags", "citations__canonical_book"
    )


def articles_citing(params) -> QuerySet:
    """その節を引用している公開記事。節のページの「引用した記事」タブで使う。"""
    book_slug = params.get("book")
    chapter = params.get("chapter")
    verse = params.get("verse")
    if not book_slug or not chapter:
        return Article.objects.none()

    condition = Q(
        citations__canonical_book__slug=book_slug,
        citations__chapter_number=chapter,
    )
    if verse:
        # 節の指定があるときは、その節を含む引用（範囲引用も含む）と
        # 章まるごとの参照を拾う。
        condition &= Q(
            citations__verse_number_start__lte=verse,
            citations__verse_number_end__gte=verse,
        ) | Q(citations__verse_number_start__isnull=True)

    return (
        Article.objects.filter(condition, visibility=Article.VISIBILITY_PUBLIC)
        .select_related("owner")
        .prefetch_related("tags")
        .distinct()
    )


def used_tags() -> QuerySet:
    """主題タグの一覧。記事が1件も無いタグは出さない。"""
    return (
        ArticleTag.objects.annotate(
            article_count=Count(
                "articles",
                filter=Q(articles__visibility=Article.VISIBILITY_PUBLIC),
                distinct=True,
            )
        )
        .filter(article_count__gt=0)
        .order_by("name")
    )


def article_comments(article: Article) -> QuerySet:
    """記事へのコメント（記事全体に対してのみ付く）。"""
    return (
        ArticleComment.objects.filter(article=article).select_related("user").order_by("created_at")
    )
