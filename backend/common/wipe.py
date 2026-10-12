"""
利用者が作ったデータを全部消す。seed_demo（--wipe / --wipe-only）と seed_launch（--wipe）が使う。

消すもの … 投稿・記事・プラン・翻訳・お気に入り・通知・読書の記録と、一般ユーザー
消さないもの … 聖書本文（CanonicalBook / Book / Chapter / Verse）、解釈書、タグの定義、
               言語の定義、管理者アカウント（superuser / staff）
"""

from django.contrib.auth import get_user_model

from articles.models import Article, ArticleCitation, ArticleComment
from bookmarks.models import Bookmark
from comments.models import Comment, Report, Vote
from notifications.models import Notification
from plans.models import (
    Plan,
    PlanDay,
    PlanDayProgress,
    PlanDayReading,
    PlanReadingProgress,
    PlanSubscription,
)
from qa.models import Answer, Question
from reading_progress.models import ReadingProgress
from translations.models import (
    TranslationComment,
    TranslationLibraryEntry,
    TranslationMembership,
    TranslationProject,
    TranslationUnit,
)

# 外部キーの依存順（指される側を後に）。子を先に消しておくと、
# 親を消すときに連鎖で集める行が減り、本番の限られたメモリでも落ちにくい。
WIPE_ORDER = [
    ("通知", Notification),
    ("プランの日の進捗", PlanDayProgress),
    ("プランの章の進捗", PlanReadingProgress),
    ("プランの購読", PlanSubscription),
    ("プランの読む章", PlanDayReading),
    ("プランの日", PlanDay),
    ("プラン", Plan),
    ("記事のコメント", ArticleComment),
    ("記事の引用", ArticleCitation),
    ("記事", Article),
    ("通報", Report),
    ("Q&A の回答", Answer),
    ("Q&A の質問", Question),
    ("投票", Vote),
    ("お気に入り", Bookmark),
    ("コメント", Comment),
    ("読書の記録", ReadingProgress),
    ("翻訳の議論", TranslationComment),
    ("翻訳の本棚", TranslationLibraryEntry),
    ("翻訳ユニット", TranslationUnit),
    ("翻訳のメンバー", TranslationMembership),
    ("翻訳プロジェクト", TranslationProject),
]


def wipe_user_data():
    """
    利用者のデータを消し、消した件数を {表の名前: 件数} で返す。
    管理者（superuser / staff）のアカウントは残すが、管理者の投稿も消える。
    """
    counts = {}
    for label, model in WIPE_ORDER:
        counts[label] = model.objects.all().delete()[0]
    User = get_user_model()
    # ユーザーの削除はログイン履歴などへ連鎖するので、ユーザー本人の数だけ数える。
    users = User.objects.filter(is_superuser=False, is_staff=False)
    counts["ユーザー（管理者以外）"] = users.count()
    users.delete()
    return counts
