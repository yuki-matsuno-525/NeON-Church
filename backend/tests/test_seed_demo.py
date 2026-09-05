"""
seed_demo（目視確認用のシード）のテスト。

小さい規模で実際に走らせて、次の 3 つを確かめる。

1. 落ちずに最後まで通ること（本番で流す前の安全確認。制約違反はここで出る）
2. 全部の機能にデータが入ること（記事・プラン・翻訳など、入れ忘れがないこと）
3. --wipe が利用者データだけを消し、聖書本文と管理者を残すこと
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

from articles.models import Article, ArticleCitation, ArticleComment
from bible.models import Book, Verse
from bookmarks.models import Bookmark
from comments.models import Comment, Report, Vote
from notifications.models import Notification
from plans.models import Plan, PlanDay, PlanDayProgress, PlanDayReading, PlanSubscription
from qa.models import Answer, Question
from reading_progress.models import ReadingProgress
from tests.factories import make_book
from translations.models import (
    TranslationComment,
    TranslationLibraryEntry,
    TranslationMembership,
    TranslationProject,
    TranslationUnit,
)

User = get_user_model()


@pytest.fixture
def scripture(db):
    """シードが箇所を選べるだけの聖書データ。書を 3 冊、それぞれ複数章・複数節。"""
    books = [
        make_book("マタイによる福音書", "口語訳", 1, slug="matthew"),
        make_book("ヨハネによる福音書", "口語訳", 2, slug="john"),
        make_book("エノク書", "R. H. Charles (EN)", 3, slug="enoch"),
    ]
    from bible.models import Chapter

    for book in books:
        for chapter_number in range(1, 4):
            chapter = Chapter.objects.create(book=book, number=chapter_number)
            for verse_number in range(1, 13):
                Verse.objects.create(
                    chapter=chapter,
                    number=verse_number,
                    text=f"{book.name} {chapter_number}:{verse_number} の本文",
                )
    return books


@pytest.fixture
def seeded(scripture):
    call_command("seed_demo", "--scale", "small", "--seed", "1")


def test_全機能にデータが入る(seeded):
    # 1 つでも 0 件なら、その機能はシードから漏れている。
    for model in (
        User,
        Comment,
        Vote,
        Question,
        Answer,
        Article,
        ArticleCitation,
        ArticleComment,
        Plan,
        PlanDay,
        PlanDayReading,
        PlanSubscription,
        PlanDayProgress,
        TranslationProject,
        TranslationMembership,
        TranslationUnit,
        TranslationComment,
        TranslationLibraryEntry,
        Bookmark,
        ReadingProgress,
        Notification,
        Report,
    ):
        assert model.objects.exists(), f"{model.__name__} が 0 件"


def test_栞は5種類すべて作られる(seeded):
    location = Bookmark.objects.filter(canonical_book__isnull=False)
    assert location.filter(chapter_number__isnull=True).exists(), "書の栞が無い"
    assert location.filter(
        chapter_number__isnull=False, verse_number__isnull=True
    ).exists(), "章の栞が無い"
    assert location.filter(verse_number__isnull=False).exists(), "節の栞が無い"
    assert Bookmark.objects.filter(comment__isnull=False).exists(), "コメントの栞が無い"
    assert Bookmark.objects.filter(
        translation_project__isnull=False
    ).exists(), "翻訳プロジェクトの栞が無い"


def test_公開状態と解決状態が両方そろう(seeded):
    assert Article.objects.filter(visibility=Article.VISIBILITY_PUBLIC).exists()
    assert Article.objects.filter(visibility=Article.VISIBILITY_PRIVATE).exists()
    assert Plan.objects.filter(visibility=Plan.VISIBILITY_PUBLIC).exists()
    assert Question.objects.filter(best_answer__isnull=False).exists(), "解決済みが無い"
    assert Question.objects.filter(best_answer__isnull=True).exists(), "未解決が無い"
    assert set(TranslationProject.objects.values_list("status", flat=True)) == {
        TranslationProject.STATUS_DRAFT,
        TranslationProject.STATUS_ACTIVE,
        TranslationProject.STATUS_PUBLISHED,
    }, "small seedで翻訳の全ライフサイクル状態が再現できない"


def test_日本語と英語が混ざる(seeded):
    usernames = set(User.objects.values_list("username", flat=True))
    # 素材の姓は言語ごとに別なので、両方から 1 つずつ出ていれば混ざっている。
    from common.seed_data import en, ja

    assert any(name.split("_")[0] in ja.FAMILY_NAMES for name in usernames)
    assert any(name.split("_")[0] in en.FAMILY_NAMES for name in usernames)


def test_返信の木と論理削除がある(seeded):
    assert Comment.objects.filter(parent__isnull=False).exists(), "返信が無い"
    assert Comment.objects.filter(is_deleted=True).exists(), "削除済みが無い"


def test_作成日時が過去にばらける(seeded):
    times = list(Comment.objects.values_list("created_at", flat=True)[:50])
    assert len(set(times)) > 1, "全部が同じ日時になっている"


def test_基準時刻を固定できる(scripture):
    reference_time = "2026-08-02T12:00:00+09:00"
    call_command(
        "seed_demo",
        "--scale",
        "small",
        "--seed",
        "1",
        "--reference-time",
        reference_time,
    )
    first_run = list(
        Comment.objects.order_by("body").values_list("body", "created_at")[:20]
    )

    call_command(
        "seed_demo",
        "--wipe",
        "--scale",
        "small",
        "--seed",
        "1",
        "--reference-time",
        reference_time,
    )
    second_run = list(
        Comment.objects.order_by("body").values_list("body", "created_at")[:20]
    )

    assert second_run == first_run


@pytest.mark.parametrize(
    "reference_time",
    ["not-a-date", "2026-08-02T12:00:00"],
)
def test_基準時刻はoffset付きISO8601だけを受け付ける(scripture, reference_time):
    with pytest.raises(CommandError, match="UTC offset付きISO 8601"):
        call_command(
            "seed_demo",
            "--scale",
            "small",
            "--reference-time",
            reference_time,
        )


def test_引用の索引が本文から作られる(seeded):
    citation = ArticleCitation.objects.select_related("article").first()
    assert citation.raw in citation.article.body


def test_二重投入は拒否される(seeded):
    with pytest.raises(CommandError):
        call_command("seed_demo", "--scale", "small")


def test_wipeは聖書と管理者を残す(scripture):
    admin = User.objects.create_superuser(
        username="keeper", email="keeper@example.com", password="x"
    )
    call_command("seed_demo", "--scale", "small", "--seed", "2")
    verses_before = Verse.objects.count()

    call_command("seed_demo", "--wipe", "--scale", "small", "--seed", "3")

    assert User.objects.filter(pk=admin.pk).exists(), "管理者が消えている"
    assert Verse.objects.count() == verses_before, "聖書本文が消えている"
    assert Book.objects.count() == len(scripture)


def test_管理者が居なければ作られる(scripture):
    call_command("seed_demo", "--scale", "small", "--seed", "4")
    assert User.objects.filter(is_superuser=True).count() == 1
