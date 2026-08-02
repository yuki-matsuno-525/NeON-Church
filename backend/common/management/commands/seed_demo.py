"""
目視確認のための特大シードデータを投入する。

    python manage.py seed_demo --wipe            # 既存を消して特大シードを入れる
    python manage.py seed_demo --wipe --scale small   # 開発コンテナ起動時の軽いシード

狙いは「たくさんの人に長く使われてきたサイト」の状態を丸ごと作ること。
一覧は全部 1 ページ 20 件なので、どの一覧も何ページも続く量を入れる。
機能ごとに「ありうる状態」を全部埋めるので、画面を開けば分岐が目に見える。

消すもの・消さないもの:
  消す   … 利用者が作ったもの全部（投稿・記事・プラン・翻訳・栞・通知・一般ユーザー）
  消さない … 聖書本文（CanonicalBook / Book / Chapter / Verse）、タグの定義、言語の定義、
             管理者アカウント（superuser / staff）

作った行の日時は、投入後にまとめて過去へばらけさせる（作成日時は自動で「今」が
入る仕組みなので、そのままだと全部が同時刻に並んで不自然になるため）。
"""

import random
import secrets
import string
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db.models import Max
from django.utils import timezone

from articles.citations import parse_body
from articles.models import (
    INITIAL_TAGS,
    Article,
    ArticleCitation,
    ArticleComment,
    ArticleTag,
)
from bible.models import Book, Chapter, Verse
from bookmarks.models import Bookmark
from comments.models import PREDEFINED_TAGS, Comment, Report, Tag, Vote
from common.seed_data import LOCALES
from notifications.models import Notification
from plans.models import (
    MAX_DAYS_PER_PLAN,
    Plan,
    PlanDay,
    PlanDayProgress,
    PlanDayReading,
    PlanSubscription,
)
from qa.models import Answer, Question
from reading_progress.models import ReadingProgress
from translations.models import (
    Language,
    TranslationComment,
    TranslationLibraryEntry,
    TranslationMembership,
    TranslationProject,
    TranslationUnit,
)

User = get_user_model()

# 規模のプリセット。xl が本番の目視確認用、small は開発コンテナの起動時用。
SCALES = {
    "small": {
        "window_days": 180,
        "users": 12,
        "comment_verses": 12,
        "comment_chapters": 4,
        "comment_books": 4,
        "reply_parents": 10,
        "vote_comments": 40,
        "project_comment_targets": 20,
        "questions": 12,
        "big_answer_count": 5,
        "articles": 12,
        "big_article_comments": 5,
        "article_comments": 20,
        "plans": 6,
        "projects": 3,
        "project_units": 20,
        "bookmarks_per_user": 6,
        "progress_per_user": 4,
        "reports": 6,
    },
    "large": {
        "window_days": 400,
        "users": 60,
        "comment_verses": 300,
        "comment_chapters": 20,
        "comment_books": 25,
        "reply_parents": 250,
        "vote_comments": 1500,
        "project_comment_targets": 300,
        "questions": 120,
        "big_answer_count": 40,
        "articles": 120,
        "big_article_comments": 60,
        "article_comments": 800,
        "plans": 40,
        "projects": 15,
        "project_units": 60,
        "bookmarks_per_user": 15,
        "progress_per_user": 10,
        "reports": 80,
    },
    "xl": {
        "window_days": 550,
        "users": 220,
        "comment_verses": 1200,
        "comment_chapters": 40,
        "comment_books": 60,
        "reply_parents": 900,
        "vote_comments": 8000,
        "project_comment_targets": 1500,
        "questions": 400,
        "big_answer_count": 80,
        "articles": 400,
        "big_article_comments": 120,
        "article_comments": 3000,
        "plans": 120,
        "projects": 40,
        "project_units": 150,
        "bookmarks_per_user": 25,
        "progress_per_user": 18,
        "reports": 300,
    },
}

# 票数のばらつき。ほとんどのコメントは少なく、一部だけが伸びる形にする。
VOTE_WEIGHTS = [0, 0, 0, 1, 1, 2, 3, 3, 5, 8, 13, 21, 34, 55]

# プランの日数のばらつき。最後の 365 日は上限の確認用。
PLAN_DAY_COUNTS = [3, 5, 7, 7, 14, 14, 21, 30, 30, 40, 60, 90]

# 外典・偽書らしい書を必ずプランに混ぜるための手がかり。
# 本番にどの書が入っているか分からないので、slug の一部が一致したものを使う。
APOCRYPHA_HINTS = [
    "enoch", "thomas", "judas", "mary", "peter", "adam", "jubilee", "tobit",
    "judith", "wisdom", "sirach", "maccabee", "baruch", "esdras", "quelle",
    "infancy", "didache", "barnabas", "hermas", "clement",
]


class Command(BaseCommand):
    help = "目視確認のための特大シードデータを投入する"

    def add_arguments(self, parser):
        parser.add_argument(
            "--wipe",
            action="store_true",
            help="既存の利用者データを消してから投入する（付けないと消さない）",
        )
        parser.add_argument(
            "--scale",
            choices=sorted(SCALES),
            default="xl",
            help="投入する量（既定: xl）",
        )
        parser.add_argument(
            "--admin-username",
            default="admin",
            help="管理者が居ないときに作るユーザー名（既定: admin）",
        )
        parser.add_argument(
            "--admin-password",
            default="",
            help="管理者を新しく作るときのパスワード。省略すると自動生成して表示する",
        )
        parser.add_argument(
            "--user-password",
            default="",
            help="シードで作る利用者の共通パスワード。省略すると自動生成して表示する",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=20260802,
            help="乱数の種。同じ種なら同じデータができる",
        )

    # ── 入口 ────────────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        self.rng = random.Random(options["seed"])
        self.scale = SCALES[options["scale"]]
        self.now = timezone.now()
        self.counts = {}

        if options["wipe"]:
            self._wipe()
        elif Comment.objects.exists() or Article.objects.exists():
            raise CommandError(
                "既にデータがあります。二重に入ると量が読めなくなるので、"
                "消してよいなら --wipe を付けて実行してください。"
            )

        catalog = self._load_catalog()
        if not catalog:
            raise CommandError(
                "聖書データが入っていません。先に import 系のコマンドを実行してください。"
            )
        self.catalog = catalog
        self.apocrypha = [
            entry for entry in catalog
            if any(hint in entry["slug"] for hint in APOCRYPHA_HINTS)
        ]

        admin, admin_password = self._ensure_admin(
            options["admin_username"], options["admin_password"]
        )
        user_password = options["user_password"] or self._random_password()
        users = self._seed_users(user_password)
        people = [admin, *users]

        comments = self._seed_comments(people)
        self._seed_votes(people, comments)
        questions, answers = self._seed_qa(people, admin)
        articles = self._seed_articles(people, admin)
        article_comments = self._seed_article_comments(people, articles)
        projects, project_comments = self._seed_translations(people, admin)
        self._seed_project_bible_comments(people, projects)
        self._seed_bookmarks(people, admin, comments, projects)
        self._seed_reading_progress(people)
        self._seed_plans(people, admin)
        self._seed_notifications(people, admin, comments, answers, project_comments)
        self._seed_reports(people, comments, questions, answers)

        self._report(admin, admin_password, user_password, article_comments)

    # ── 片付け ──────────────────────────────────────────────────────────────

    def _wipe(self):
        """利用者が作ったものを、外部キーの依存順に消す。聖書本文と管理者は残す。"""
        self.stdout.write("既存データを消しています...")
        for model in (
            Notification,
            PlanDayProgress,
            PlanSubscription,
            PlanDayReading,
            PlanDay,
            Plan,
            ArticleComment,
            ArticleCitation,
            Article,
            Report,
            Answer,
            Question,
            Vote,
            Bookmark,
            Comment,
            ReadingProgress,
            TranslationComment,
            TranslationLibraryEntry,
            TranslationUnit,
            TranslationMembership,
            TranslationProject,
        ):
            model.objects.all().delete()
        # 管理者だけ残す。ここまでで管理者に紐づく投稿も消えている。
        User.objects.filter(is_superuser=False, is_staff=False).delete()
        self.stdout.write("  消し終わりました")

    # ── 下ごしらえ ──────────────────────────────────────────────────────────

    def _load_catalog(self):
        """
        書ごとに「章と、その章の最大節番号」を控えた目録を作る。

        コメント・質問・栞・記事の引用・プランは、訳に依らない書と番号で箇所を持つので、
        節の実体は要らない。番号の範囲さえ分かれば、存在する箇所だけを指せる。
        訳ごとに章立てが違うことがあるので、代表の 1 訳から数える。
        """
        books = list(Book.objects.select_related("canonical_book").order_by("order"))
        if not books:
            return []

        by_canonical = {}
        for book in books:
            by_canonical.setdefault(book.canonical_book_id, []).append(book)

        def representative(editions):
            # 口語訳 → KJV → 最初の訳、の順で代表を選ぶ（章立ての基準にするだけ）。
            for preferred in ("口語訳", "KJV"):
                for book in editions:
                    if book.translation == preferred:
                        return book
            return editions[0]

        reps = {cid: representative(editions) for cid, editions in by_canonical.items()}
        chapter_rows = (
            Verse.objects.filter(chapter__book_id__in=[b.id for b in reps.values()])
            .values("chapter__book__canonical_book_id", "chapter__number")
            .annotate(max_number=Max("number"))
        )
        chapters = {}
        for row in chapter_rows:
            cid = row["chapter__book__canonical_book_id"]
            chapters.setdefault(cid, []).append((row["chapter__number"], row["max_number"]))

        catalog = []
        for cid, editions in by_canonical.items():
            book_chapters = sorted(chapters.get(cid, []))
            if not book_chapters:
                continue
            catalog.append({
                "id": cid,
                "slug": editions[0].canonical_book.slug,
                "chapters": book_chapters,
                "translations": sorted({b.translation for b in editions}),
                "editions": [b.id for b in editions],
                "rep_book_id": reps[cid].id,
            })
        catalog.sort(key=lambda entry: entry["slug"])
        self.stdout.write(f"  聖書データ: {len(catalog)} 書（訳の異なる版は {len(books)} 冊）")
        return catalog

    def _ensure_admin(self, username, password):
        """管理者を用意する。既に居ればそれを使い、居なければ作る。"""
        admin = User.objects.filter(is_superuser=True).order_by("created_at").first()
        if admin:
            return admin, ""
        password = password or self._random_password()
        admin = User.objects.create_superuser(
            username=username,
            email=f"{username}@neon-church.com",
            password=password,
            bio="このサイトを作っている人です。全部の機能をひととおり使っています。",
        )
        return admin, password

    def _random_password(self):
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(16))

    # ── 共通の道具 ──────────────────────────────────────────────────────────

    def _past(self, bias=2.0, max_days=None):
        """過去の日時を1つ返す。bias を大きくするほど最近寄りになる。"""
        span = max_days if max_days is not None else self.scale["window_days"]
        days = span * (self.rng.random() ** bias)
        return self.now - timedelta(days=days, seconds=self.rng.randrange(86400))

    def _after(self, moment, max_days=30):
        """ある日時より後の日時を返す（返信を親より後にするため）。"""
        later = moment + timedelta(
            seconds=self.rng.randrange(60, max_days * 86400)
        )
        return min(later, self.now - timedelta(seconds=60))

    def _save(self, model, objects, times, label=None):
        """
        まとめて作ってから、作成日時を狙った値に直す。

        作成日時は保存時に自動で「今」が入るので、入れ終わってから上書きする。
        bulk_update は自動更新を通らないので、この順番なら意図した日時が残る。
        """
        if not objects:
            return objects
        model.objects.bulk_create(objects, batch_size=1000)
        for obj, moment in zip(objects, times):
            obj.created_at = moment
            obj.updated_at = moment
        model.objects.bulk_update(
            objects, ["created_at", "updated_at"], batch_size=500
        )
        if label:
            self.counts[label] = self.counts.get(label, 0) + len(objects)
        return objects

    def _locale(self):
        return self.rng.choice(LOCALES)

    def _sentences(self, locale, pool, low=1, high=3):
        """素材の文を 1〜3 つ選んでつなぎ、1 件分の本文にする。"""
        count = min(self.rng.randint(low, high), len(pool))
        joiner = " " if locale.LANG == "en" else ""
        return joiner.join(self.rng.sample(pool, count))

    def _passage(self, entry=None):
        """存在する箇所（書・章・節）を1つ選ぶ。"""
        entry = entry or self.rng.choice(self.catalog)
        chapter_number, max_verse = self.rng.choice(entry["chapters"])
        return entry, chapter_number, self.rng.randint(1, max_verse)

    def _location(self, entry, chapter_number=None, verse_number=None):
        """コメント・質問が持つ箇所の列をまとめて作る。"""
        return {
            "canonical_book_id": entry["id"],
            "chapter_number": chapter_number,
            "verse_number": verse_number,
            "source_translation": self.rng.choice(entry["translations"]),
        }

    def _link_tags(self, through, owner_field, tag_field, rows):
        """タグの結び付けをまとめて入れる（同じ組み合わせが重なっても無視する）。"""
        through.objects.bulk_create(
            [
                through(**{owner_field: obj_id, tag_field: tag_id})
                for obj_id, tag_id in rows
            ],
            batch_size=1000,
            ignore_conflicts=True,
        )

    # ── 人 ──────────────────────────────────────────────────────────────────

    def _seed_users(self, password):
        """日本語圏と英語圏の利用者を半々で作る。"""
        target = self.scale["users"]
        users, times, taken = [], [], set(
            User.objects.values_list("username", flat=True)
        )
        # パスワードの計算は重いので 1 回だけ行い、全員で使い回す。
        template = User(username="__template__")
        template.set_password(password)
        password_hash = template.password

        for index in range(target):
            locale = LOCALES[index % len(LOCALES)]
            base = (
                f"{self.rng.choice(locale.FAMILY_NAMES)}_"
                f"{self.rng.choice(locale.GIVEN_NAMES)}"
            )
            username = base
            suffix = 2
            while username in taken:
                username = f"{base}{suffix}"
                suffix += 1
            taken.add(username)

            bio = ""
            if self.rng.random() < 0.92:
                bio = (
                    f"{self.rng.choice(locale.BIO_ROLES)}。"
                    if locale.LANG == "ja"
                    else f"{self.rng.choice(locale.BIO_ROLES)}. "
                )
                bio += self.rng.choice(locale.BIO_INTERESTS)
                closer = self.rng.choice(locale.BIO_CLOSERS)
                if closer:
                    bio += ("" if locale.LANG == "ja" else " ") + closer

            users.append(User(
                username=username,
                email=f"{username}@example.com",
                bio=bio,
                password=password_hash,
                bookmarks_visibility=(
                    User.BOOKMARKS_PUBLIC if self.rng.random() < 0.35
                    else User.BOOKMARKS_PRIVATE
                ),
                in_app_notifications_enabled=True,
                email_notifications_enabled=self.rng.random() < 0.25,
            ))
            times.append(self._past(bias=1.2))

        User.objects.bulk_create(users, batch_size=500)
        for user, moment in zip(users, times):
            user.created_at = moment
            user.updated_at = moment
        User.objects.bulk_update(users, ["created_at", "updated_at"], batch_size=500)
        self.counts["利用者"] = len(users)
        self.stdout.write(f"  利用者 {len(users)} 人")
        return users

    # ── コメント ────────────────────────────────────────────────────────────

    def _seed_comments(self, people):
        """節・章・書のコメントと、深さ 5 までの返信を作る。"""
        tags = {tag.name: tag for tag in self._ensure_comment_tags()}
        tag_ids = [tag.id for tag in tags.values()]
        objects, times, tag_rows = [], [], []

        def add(user, location, body, parent=None, moment=None):
            moment = moment or self._past()
            comment = Comment(user=user, body=body, parent=parent, **location)
            objects.append(comment)
            times.append(moment)
            if parent is None and tag_ids and self.rng.random() < 0.6:
                for tag_id in self.rng.sample(tag_ids, self.rng.randint(1, 2)):
                    tag_rows.append((comment.id, tag_id))
            return comment

        # 節コメント。人気の差が出るように、件数を偏らせる。
        verse_comments = []
        for _ in range(self.scale["comment_verses"]):
            entry, chapter_number, verse_number = self._passage()
            location = self._location(entry, chapter_number, verse_number)
            for _ in range(self.rng.choice([3, 3, 4, 5, 6, 8, 12, 18, 25])):
                locale = self._locale()
                verse_comments.append(add(
                    self.rng.choice(people),
                    dict(location),
                    self._sentences(locale, locale.COMMENT_SENTENCES),
                ))

        # 章コメント。1 章に 30〜80 件つけて、章タブのページ送りを試せるようにする。
        for _ in range(self.scale["comment_chapters"]):
            entry = self.rng.choice(self.catalog)
            chapter_number = self.rng.choice(entry["chapters"])[0]
            location = self._location(entry, chapter_number, None)
            for _ in range(self.rng.randint(30, 80)):
                locale = self._locale()
                add(
                    self.rng.choice(people),
                    dict(location),
                    self._sentences(locale, locale.CHAPTER_SENTENCES, 1, 2),
                )

        # 書コメント。
        for entry in self.rng.sample(
            self.catalog, min(self.scale["comment_books"], len(self.catalog))
        ):
            location = self._location(entry, None, None)
            for _ in range(self.rng.randint(2, 10)):
                locale = self._locale()
                add(
                    self.rng.choice(people),
                    dict(location),
                    self._sentences(locale, locale.BOOK_SENTENCES, 1, 2),
                )

        self._save(Comment, objects, times, "コメント")
        created = list(objects)

        # 返信の木。親を保存してから子を作るので、段ごとに保存する。
        parents = self.rng.sample(
            verse_comments, min(self.scale["reply_parents"], len(verse_comments))
        )
        parent_times = dict(zip(objects, times))
        for depth in range(5):
            objects, times = [], []
            next_parents = []
            for parent in parents:
                if depth and self.rng.random() > (0.55 - depth * 0.1):
                    continue
                for _ in range(self.rng.randint(1, 4 if depth == 0 else 2)):
                    locale = self._locale()
                    moment = self._after(parent_times.get(parent, self._past()))
                    reply = add(
                        self.rng.choice(people),
                        self._reply_location(parent),
                        self._sentences(locale, locale.REPLY_SENTENCES, 1, 2),
                        parent=parent,
                        moment=moment,
                    )
                    next_parents.append(reply)
            if not objects:
                break
            self._save(Comment, objects, times, "コメント")
            parent_times.update(zip(objects, times))
            created.extend(objects)
            parents = next_parents

        self._link_tags(Comment.tags.through, "comment_id", "tag_id", tag_rows)

        # 論理削除。返信の親になっているものも混ぜて、木が壊れないことを見えるようにする。
        deletable = [c for c in created if c.parent is None]
        for comment in self.rng.sample(
            deletable, min(len(deletable), max(3, len(deletable) // 60))
        ):
            comment.is_deleted = True
            comment.body = ""
        Comment.objects.bulk_update(
            [c for c in deletable if c.is_deleted], ["is_deleted", "body"], batch_size=500
        )
        self.stdout.write(f"  コメント {len(created)} 件")
        return created

    def _reply_location(self, parent):
        return {
            "canonical_book_id": parent.canonical_book_id,
            "chapter_number": parent.chapter_number,
            "verse_number": parent.verse_number,
            "source_translation": parent.source_translation,
            "translation_project_id": parent.translation_project_id,
        }

    def _ensure_comment_tags(self):
        tags = []
        for name, _ in PREDEFINED_TAGS:
            tag, _created = Tag.objects.get_or_create(name=name)
            tags.append(tag)
        return tags

    def _seed_votes(self, people, comments):
        """票を入れる。伸びるコメントと伸びないコメントの差を作る。"""
        alive = [c for c in comments if not c.is_deleted]
        targets = self.rng.sample(
            alive, min(self.scale["vote_comments"], len(alive))
        )
        votes, times = [], []
        for comment in targets:
            wanted = min(self.rng.choice(VOTE_WEIGHTS), len(people) - 1)
            if not wanted:
                continue
            for voter in self.rng.sample(people, wanted):
                if voter.id == comment.user_id:
                    continue
                votes.append(Vote(user=voter, comment=comment))
                times.append(self._after(comment.created_at, max_days=60))
        self._save(Vote, votes, times, "票")
        self.stdout.write(f"  票 {len(votes)} 件")

    # ── Q&A ────────────────────────────────────────────────────────────────

    def _seed_qa(self, people, admin):
        """質問と回答。未解決・解決済みの両方を、それぞれ何ページ分も作る。"""
        tag_ids = [tag.id for tag in Tag.objects.all()]
        questions, times, tag_rows = [], [], []
        for index in range(self.scale["questions"]):
            locale = self._locale()
            title, body = self.rng.choice(locale.QUESTION_PAIRS)
            entry, chapter_number, verse_number = self._passage()
            # 粒度は 書 / 章 / 節 の 3 種を混ぜる。
            grain = self.rng.random()
            if grain < 0.15:
                chapter_number, verse_number = None, None
            elif grain < 0.35:
                verse_number = None
            # 質問の 1 割は管理者のものにして、自分の投稿として編集画面を試せるようにする。
            user = admin if index % 40 == 0 else self.rng.choice(people)
            question = Question(
                user=user,
                title=title,
                body=body,
                **self._location(entry, chapter_number, verse_number),
            )
            questions.append(question)
            times.append(self._past())
            if tag_ids and self.rng.random() < 0.7:
                for tag_id in self.rng.sample(tag_ids, self.rng.randint(1, 2)):
                    tag_rows.append((question.id, tag_id))
        self._save(Question, questions, times, "質問")
        self._link_tags(Question.tags.through, "question_id", "tag_id", tag_rows)

        question_times = dict(zip(questions, times))
        answers, answer_times = [], []
        best_by_question = {}
        for question in questions:
            # 回答 0 件の質問も残す（「まだ回答がありません」の表示確認）。
            count = self.rng.choice([0, 0, 1, 1, 2, 3, 3, 4, 6, 8, 12, 15])
            for _ in range(count):
                locale = self._locale()
                answer = Answer(
                    question=question,
                    user=self.rng.choice(people),
                    body=self._sentences(locale, locale.ANSWER_SENTENCES, 1, 3),
                )
                answers.append(answer)
                answer_times.append(self._after(question_times[question], max_days=90))
                # 半分の質問は解決済みにする。二列とも十分な件数になる。
                if count and self.rng.random() < 0.12:
                    best_by_question[question.id] = answer

        # 回答一覧のページ送りを試すため、1 問だけ回答を大量に付ける。
        crowded = questions[0]
        for _ in range(self.scale["big_answer_count"]):
            locale = self._locale()
            answer = Answer(
                question=crowded,
                user=self.rng.choice(people),
                body=self._sentences(locale, locale.ANSWER_SENTENCES, 1, 3),
            )
            answers.append(answer)
            answer_times.append(self._after(question_times[crowded], max_days=200))
        self._save(Answer, answers, answer_times, "回答")

        # 回答の 1 割ほどを論理削除して、削除済みが件数に混ざらないことを確認できるようにする。
        deleted = self.rng.sample(answers, min(len(answers), max(1, len(answers) // 25)))
        for answer in deleted:
            answer.is_deleted = True
        Answer.objects.bulk_update(deleted, ["is_deleted"], batch_size=500)

        solved = []
        for question in questions:
            best = best_by_question.get(question.id)
            if best and not best.is_deleted:
                question.best_answer = best
                solved.append(question)
        # 解決済みが半数になるよう、まだ解決していない質問にも印をつける。
        pool = [q for q in questions if q.best_answer_id is None]
        by_question = {}
        for answer in answers:
            if not answer.is_deleted:
                by_question.setdefault(answer.question_id, answer)
        for question in pool:
            if len(solved) >= len(questions) // 2:
                break
            best = by_question.get(question.id)
            if best:
                question.best_answer = best
                solved.append(question)
        Question.objects.bulk_update(solved, ["best_answer"], batch_size=500)

        self.stdout.write(
            f"  質問 {len(questions)} 件（解決済み {len(solved)} 件） / 回答 {len(answers)} 件"
        )
        return questions, answers

    # ── 記事 ────────────────────────────────────────────────────────────────

    def _seed_articles(self, people, admin):
        """記事。公開・限定公開・下書きと、引用の印を全パターン入れる。"""
        tags = self._ensure_article_tags()
        articles, times, tag_rows = [], [], []
        visibilities = (
            [Article.VISIBILITY_PUBLIC] * 8
            + [Article.VISIBILITY_UNLISTED]
            + [Article.VISIBILITY_PRIVATE]
        )
        for index in range(self.scale["articles"]):
            locale = self._locale()
            title = (
                f"{self.rng.choice(locale.ARTICLE_TITLE_HEADS)}"
                f"{'' if locale.LANG == 'ja' else ' '}"
                f"{self.rng.choice(locale.ARTICLE_TITLE_TAILS)}"
            )
            # 長い記事・引用の多い記事・印の壊れた記事を意図的に混ぜる。
            long_form = index % 25 == 0
            broken = index % 33 == 0
            body = self._article_body(locale, long_form=long_form, broken=broken)
            article = Article(
                owner=admin if index % 40 == 0 else self.rng.choice(people),
                title=title,
                summary=self.rng.choice(locale.ARTICLE_SUMMARIES),
                body=body,
                visibility=self.rng.choice(visibilities),
            )
            articles.append(article)
            times.append(self._past())
            for tag in self.rng.sample(tags, self.rng.randint(1, 3)):
                tag_rows.append((article.id, tag.id))

        # 管理者の記事は、公開・限定公開・下書きを必ず 1 本ずつ持たせる。
        for visibility in (
            Article.VISIBILITY_PUBLIC,
            Article.VISIBILITY_UNLISTED,
            Article.VISIBILITY_PRIVATE,
        ):
            locale = LOCALES[0]
            article = Article(
                owner=admin,
                title=f"{self.rng.choice(locale.ARTICLE_TITLE_HEADS)}"
                      f"{self.rng.choice(locale.ARTICLE_TITLE_TAILS)}",
                summary=self.rng.choice(locale.ARTICLE_SUMMARIES),
                body=self._article_body(locale, long_form=False, broken=False),
                visibility=visibility,
            )
            articles.append(article)
            times.append(self._past(bias=3.0))
            tag_rows.append((article.id, self.rng.choice(tags).id))

        self._save(Article, articles, times, "記事")
        self._link_tags(Article.tags.through, "article_id", "articletag_id", tag_rows)
        self._sync_citations(articles)
        self.stdout.write(f"  記事 {len(articles)} 件")
        return articles

    def _ensure_article_tags(self):
        tags = []
        for name, slug in INITIAL_TAGS:
            tag, _created = ArticleTag.objects.get_or_create(
                name=name, defaults={"slug": slug}
            )
            tags.append(tag)
        return tags

    def _citation_mark(self, block=False, with_translation=False, whole_chapter=False):
        """引用の印を 1 つ作る。書式は articles/citations.py の仕様どおり。"""
        entry, chapter_number, verse_number = self._passage()
        if whole_chapter:
            return f"[[{entry['slug']} {chapter_number}]]"
        max_verse = dict(entry["chapters"])[chapter_number]
        reference = f"{entry['slug']} {chapter_number}:{verse_number}"
        if self.rng.random() < 0.4 and verse_number < max_verse:
            end = min(max_verse, verse_number + self.rng.randint(1, 5))
            reference = f"{entry['slug']} {chapter_number}:{verse_number}-{end}"
        if with_translation:
            reference = f"{reference}|{self.rng.choice(entry['translations'])}"
        return f"{{{{{reference}}}}}" if block else f"[[{reference}]]"

    def _article_body(self, locale, long_form, broken):
        """Markdown の本文を組み立てる。見出し・箇条書き・引用・強調を混ぜる。"""
        blocks = []
        sections = self.rng.randint(12, 20) if long_form else self.rng.randint(3, 8)
        for index in range(sections):
            if index == 0 or self.rng.random() < 0.5:
                blocks.append(f"## {self.rng.choice(locale.ARTICLE_HEADINGS)}")
            paragraph = self.rng.choice(locale.ARTICLE_PARAGRAPHS)
            if self.rng.random() < 0.5:
                paragraph += self._citation_mark()
            blocks.append(paragraph)
            roll = self.rng.random()
            if roll < 0.3:
                blocks.append(self._citation_mark(block=True))
            elif roll < 0.4:
                blocks.append(self._citation_mark(block=True, with_translation=True))
            elif roll < 0.5:
                blocks.append(self._citation_mark(whole_chapter=True))
            elif roll < 0.6:
                blocks.append(
                    "\n".join(
                        f"- {self.rng.choice(locale.ARTICLE_SUMMARIES)}"
                        for _ in range(self.rng.randint(2, 4))
                    )
                )
            elif roll < 0.68:
                blocks.append(f"> {self.rng.choice(locale.ARTICLE_PARAGRAPHS)}")
        if broken:
            # 存在しない書への印。画面で「見つかりません」と出ることの確認用。
            blocks.append(f"[[notabook 1:1]] {self.rng.choice(locale.ARTICLE_PARAGRAPHS)}")
        return "\n\n".join(blocks)

    def _sync_citations(self, articles):
        """本文の印から引用の索引をまとめて作る（記事ごとに問い合わせない）。"""
        parsed = [(article, parse_body(article.body)) for article in articles]
        slugs = {item["book_slug"] for _article, items in parsed for item in items}
        book_ids = {
            entry["slug"]: entry["id"] for entry in self.catalog if entry["slug"] in slugs
        }
        citations = []
        for article, items in parsed:
            for item in items:
                if item["book_slug"] not in book_ids:
                    continue
                citations.append(ArticleCitation(
                    article=article,
                    raw=item["raw"],
                    kind=item["kind"],
                    canonical_book_id=book_ids[item["book_slug"]],
                    chapter_number=item["chapter_number"],
                    verse_number_start=item["verse_number_start"],
                    verse_number_end=item["verse_number_end"],
                    translation=item["translation"],
                    order=item["order"],
                ))
        ArticleCitation.objects.bulk_create(citations, batch_size=1000)
        self.counts["記事の引用"] = len(citations)

    def _seed_article_comments(self, people, articles):
        """記事へのコメント。返信・論理削除つき。1 本だけ大量に付ける。"""
        readable = [a for a in articles if a.visibility != Article.VISIBILITY_PRIVATE]
        objects, times = [], []
        for _ in range(self.scale["article_comments"]):
            article = self.rng.choice(readable)
            locale = self._locale()
            objects.append(ArticleComment(
                article=article,
                user=self.rng.choice(people),
                body=self._sentences(locale, locale.ARTICLE_COMMENT_SENTENCES, 1, 2),
            ))
            times.append(self._after(article.created_at, max_days=120))

        crowded = readable[0]
        for _ in range(self.scale["big_article_comments"]):
            locale = self._locale()
            objects.append(ArticleComment(
                article=crowded,
                user=self.rng.choice(people),
                body=self._sentences(locale, locale.ARTICLE_COMMENT_SENTENCES, 1, 2),
            ))
            times.append(self._after(crowded.created_at, max_days=200))
        self._save(ArticleComment, objects, times, "記事のコメント")

        # 返信（1 段）。
        replies, reply_times = [], []
        for parent in self.rng.sample(objects, max(1, len(objects) // 4)):
            locale = self._locale()
            replies.append(ArticleComment(
                article_id=parent.article_id,
                user=self.rng.choice(people),
                parent=parent,
                body=self._sentences(locale, locale.ARTICLE_COMMENT_SENTENCES, 1, 2),
            ))
            reply_times.append(self._after(parent.created_at, max_days=30))
        self._save(ArticleComment, replies, reply_times, "記事のコメント")

        deleted = self.rng.sample(objects, max(1, len(objects) // 30))
        for comment in deleted:
            comment.is_deleted = True
        ArticleComment.objects.bulk_update(deleted, ["is_deleted"], batch_size=500)
        self.stdout.write(f"  記事のコメント {len(objects) + len(replies)} 件")
        return objects + replies

    # ── 翻訳プロジェクト ────────────────────────────────────────────────────

    def _seed_translations(self, people, admin):
        """プロジェクト・メンバー・ユニット・議論・本棚をまとめて作る。"""
        languages = list(Language.objects.values_list("tag", flat=True)) or ["ja", "en"]
        statuses = (
            [TranslationProject.STATUS_PUBLISHED] * 3
            + [TranslationProject.STATUS_ACTIVE] * 3
            + [TranslationProject.STATUS_DRAFT] * 2
        )
        source_books = list(
            Book.objects.filter(
                id__in=[entry["rep_book_id"] for entry in self.catalog]
            ).order_by("order")
        )

        projects, times = [], []
        for index in range(self.scale["projects"]):
            locale = self._locale()
            head = self.rng.choice(locale.PROJECT_NAME_HEADS)
            book = source_books[index % len(source_books)]
            name = f"{head}{'' if locale.LANG == 'ja' else ' '}{book.name}"
            # 管理者にも 2 本持たせて、オーナー側の画面を試せるようにする。
            owner = admin if index < 2 else self.rng.choice(people)
            projects.append(TranslationProject(
                name=name,
                description=self.rng.choice(locale.PROJECT_DESCRIPTIONS),
                owner=owner,
                source_book=book,
                target_language=(
                    locale.LANG if self.rng.random() < 0.6 else self.rng.choice(languages)
                ),
                status=self.rng.choice(statuses),
            ))
            times.append(self._past(bias=1.5))
        self._save(TranslationProject, projects, times, "翻訳プロジェクト")

        memberships, membership_times = [], []
        members_by_project = {}
        for project, moment in zip(projects, times):
            memberships.append(TranslationMembership(
                project=project,
                user_id=project.owner_id,
                role=TranslationMembership.ROLE_OWNER,
                status=TranslationMembership.STATUS_APPROVED,
            ))
            membership_times.append(moment)
            others = [u for u in people if u.id != project.owner_id]
            approved = self.rng.sample(others, min(self.rng.randint(3, 15), len(others)))
            rest = [u for u in others if u not in approved]
            pending = self.rng.sample(rest, min(self.rng.randint(0, 8), len(rest)))
            rest = [u for u in rest if u not in pending]
            rejected = self.rng.sample(rest, min(self.rng.randint(0, 3), len(rest)))
            for group, status in (
                (approved, TranslationMembership.STATUS_APPROVED),
                (pending, TranslationMembership.STATUS_PENDING),
                (rejected, TranslationMembership.STATUS_REJECTED),
            ):
                for user in group:
                    memberships.append(TranslationMembership(
                        project=project,
                        user=user,
                        role=TranslationMembership.ROLE_MEMBER,
                        status=status,
                    ))
                    membership_times.append(self._after(moment, max_days=90))
            members_by_project[project.id] = [project.owner, *approved]
        self._save(TranslationMembership, memberships, membership_times, "翻訳の参加者")

        # 管理者を「参加中 3 本・承認待ち 1 本」の状態にする。
        extra = [p for p in projects if p.owner_id != admin.id][:4]
        admin_memberships, admin_times = [], []
        for index, project in enumerate(extra):
            admin_memberships.append(TranslationMembership(
                project=project,
                user=admin,
                role=TranslationMembership.ROLE_MEMBER,
                status=(
                    TranslationMembership.STATUS_PENDING if index == 3
                    else TranslationMembership.STATUS_APPROVED
                ),
            ))
            admin_times.append(self._past(bias=3.0))
            if index < 3:
                members_by_project[project.id].append(admin)
        TranslationMembership.objects.filter(
            project__in=extra, user=admin
        ).delete()
        self._save(
            TranslationMembership, admin_memberships, admin_times, "翻訳の参加者"
        )

        units, unit_times = [], []
        unit_statuses = [
            TranslationUnit.STATUS_TODO,
            TranslationUnit.STATUS_TODO,
            TranslationUnit.STATUS_IN_PROGRESS,
            TranslationUnit.STATUS_REVIEW,
            TranslationUnit.STATUS_DONE,
        ]
        for project, moment in zip(projects, times):
            verses = list(
                Verse.objects.filter(chapter__book_id=project.source_book_id)
                .order_by("chapter__number", "number")[: self.scale["project_units"]]
            )
            members = members_by_project[project.id]
            locale = LOCALES[0] if project.target_language == "ja" else LOCALES[1]
            for index, verse in enumerate(verses):
                status = unit_statuses[index % len(unit_statuses)]
                done = status in (
                    TranslationUnit.STATUS_REVIEW, TranslationUnit.STATUS_DONE
                )
                units.append(TranslationUnit(
                    project=project,
                    verse=verse,
                    assigned_to=(
                        None if status == TranslationUnit.STATUS_TODO
                        else self.rng.choice(members)
                    ),
                    body=self.rng.choice(locale.UNIT_BODIES) if done else "",
                    status=status,
                ))
                unit_times.append(self._after(moment, max_days=200))
        self._save(TranslationUnit, units, unit_times, "翻訳のユニット")

        units_by_project = {}
        for unit in units:
            units_by_project.setdefault(unit.project_id, []).append(unit)

        discussions, discussion_times = [], []
        for project, moment in zip(projects, times):
            members = members_by_project[project.id]
            locale = LOCALES[0] if project.target_language == "ja" else LOCALES[1]
            # プロジェクト全体への投稿を 25 件超にして、議論のページ送りを試せるようにする。
            for _ in range(self.rng.randint(22, 40)):
                discussions.append(TranslationComment(
                    project=project,
                    user=self.rng.choice(members),
                    body=self._sentences(locale, locale.PROJECT_COMMENT_SENTENCES, 1, 2),
                ))
                discussion_times.append(self._after(moment, max_days=200))
            for unit in units_by_project.get(project.id, [])[:20]:
                if self.rng.random() < 0.6:
                    discussions.append(TranslationComment(
                        project=project,
                        unit=unit,
                        user=self.rng.choice(members),
                        body=self._sentences(
                            locale, locale.PROJECT_COMMENT_SENTENCES, 1, 2
                        ),
                    ))
                    discussion_times.append(self._after(moment, max_days=200))
        self._save(TranslationComment, discussions, discussion_times, "翻訳の議論")

        # 本棚（公開プロジェクトを自分の /read に並べた状態）。
        published = [
            p for p in projects if p.status == TranslationProject.STATUS_PUBLISHED
        ]
        entries, entry_times = [], []
        for project in published:
            for user in self.rng.sample(
                people, min(self.rng.randint(5, 60), len(people))
            ):
                entries.append(TranslationLibraryEntry(user=user, project=project))
                entry_times.append(self._past())
        if published:
            for project in published[:5]:
                if not any(
                    e.user_id == admin.id and e.project_id == project.id for e in entries
                ):
                    entries.append(
                        TranslationLibraryEntry(user=admin, project=project)
                    )
                    entry_times.append(self._past(bias=3.0))
        self._save(TranslationLibraryEntry, entries, entry_times, "翻訳の本棚")

        self.stdout.write(
            f"  翻訳プロジェクト {len(projects)} 件 / ユニット {len(units)} 件"
        )
        return projects, discussions

    def _seed_project_bible_comments(self, people, projects):
        """翻訳プロジェクト向けのコメント（聖書本体のコメントとは分かれて表示される）。"""
        if not projects:
            return []
        by_book = {entry["rep_book_id"]: entry for entry in self.catalog}
        objects, times = [], []
        for _ in range(self.scale["project_comment_targets"]):
            project = self.rng.choice(projects)
            entry = by_book.get(project.source_book_id) or self.rng.choice(self.catalog)
            _entry, chapter_number, verse_number = self._passage(entry)
            locale = self._locale()
            objects.append(Comment(
                user=self.rng.choice(people),
                translation_project=project,
                body=self._sentences(locale, locale.COMMENT_SENTENCES, 1, 2),
                **self._location(entry, chapter_number, verse_number),
            ))
            times.append(self._past())
        self._save(Comment, objects, times, "コメント")
        return []

    # ── 栞・読書進捗 ────────────────────────────────────────────────────────

    def _seed_bookmarks(self, people, admin, comments, projects):
        """お気に入り。書・章・節・コメント・翻訳プロジェクトの 5 種すべてを入れる。"""
        alive = [c for c in comments if not c.is_deleted]
        objects, times = [], []
        for user in people:
            wanted = self.rng.randint(4, self.scale["bookmarks_per_user"] * 2)
            if user.id == admin.id:
                wanted = max(wanted, 80)
            seen = set()
            for _ in range(wanted):
                kind = self.rng.random()
                if kind < 0.12:
                    entry = self.rng.choice(self.catalog)
                    key = ("book", entry["id"])
                    location = {"canonical_book_id": entry["id"]}
                elif kind < 0.32:
                    entry = self.rng.choice(self.catalog)
                    chapter_number = self.rng.choice(entry["chapters"])[0]
                    key = ("chapter", entry["id"], chapter_number)
                    location = {
                        "canonical_book_id": entry["id"],
                        "chapter_number": chapter_number,
                    }
                elif kind < 0.75:
                    entry, chapter_number, verse_number = self._passage()
                    key = ("verse", entry["id"], chapter_number, verse_number)
                    location = {
                        "canonical_book_id": entry["id"],
                        "chapter_number": chapter_number,
                        "verse_number": verse_number,
                    }
                elif kind < 0.92 and alive:
                    comment = self.rng.choice(alive)
                    if comment.user_id == user.id:
                        continue
                    key = ("comment", comment.id)
                    location = {"comment_id": comment.id}
                elif projects:
                    project = self.rng.choice(projects)
                    key = ("project", project.id)
                    location = {"translation_project_id": project.id}
                else:
                    continue
                if key in seen:
                    continue
                seen.add(key)
                objects.append(Bookmark(user=user, **location))
                times.append(self._past())
        self._save(Bookmark, objects, times, "お気に入り")
        self.stdout.write(f"  お気に入り {len(objects)} 件")

    def _seed_reading_progress(self, people):
        """読みかけの記録。最終読書日時をばらけさせる。"""
        chapters = {}
        for chapter_id, book_id in Chapter.objects.values_list("id", "book_id"):
            chapters.setdefault(book_id, []).append(chapter_id)
        book_ids = list(chapters)
        objects, times = [], []
        for user in people:
            wanted = min(
                self.rng.randint(3, self.scale["progress_per_user"] * 2), len(book_ids)
            )
            for book_id in self.rng.sample(book_ids, wanted):
                objects.append(ReadingProgress(
                    user=user,
                    book_id=book_id,
                    chapter_id=self.rng.choice(chapters[book_id]),
                ))
                times.append(self._past(bias=3.0))
        self._save(ReadingProgress, objects, times, "読みかけ")
        self.stdout.write(f"  読みかけ {len(objects)} 件")

    # ── プラン ──────────────────────────────────────────────────────────────

    def _seed_plans(self, people, admin):
        """プラン。日数のばらつき・正典と外典をまたぐ並び・購読と進捗を作る。"""
        visibilities = (
            [Plan.VISIBILITY_PUBLIC] * 8
            + [Plan.VISIBILITY_UNLISTED]
            + [Plan.VISIBILITY_PRIVATE]
        )
        plans, times, day_counts = [], [], []
        for index in range(self.scale["plans"]):
            locale = self._locale()
            title = (
                f"{self.rng.choice(locale.PLAN_TITLE_HEADS)}"
                f"{'' if locale.LANG == 'ja' else ' '}"
                f"{self.rng.choice(locale.PLAN_TITLE_TAILS)}"
            )
            plans.append(Plan(
                owner=admin if index % 25 == 0 else self.rng.choice(people),
                title=title,
                description=self.rng.choice(locale.PLAN_DESCRIPTIONS),
                note=self.rng.choice(locale.PLAN_NOTES),
                visibility=self.rng.choice(visibilities),
            ))
            times.append(self._past(bias=1.5))
            # 1 本だけ 1 年通読（上限 365 日）にする。
            day_counts.append(
                MAX_DAYS_PER_PLAN if index == 1 else self.rng.choice(PLAN_DAY_COUNTS)
            )

        # 管理者のプランは、公開・下書き・読者ゼロを必ず 1 本ずつ用意する。
        for visibility in (Plan.VISIBILITY_PUBLIC, Plan.VISIBILITY_PRIVATE):
            locale = LOCALES[0]
            plans.append(Plan(
                owner=admin,
                title=f"{self.rng.choice(locale.PLAN_TITLE_HEADS)}"
                      f"{self.rng.choice(locale.PLAN_TITLE_TAILS)}",
                description=self.rng.choice(locale.PLAN_DESCRIPTIONS),
                visibility=visibility,
            ))
            times.append(self._past(bias=3.0))
            day_counts.append(self.rng.choice(PLAN_DAY_COUNTS))
        self._save(Plan, plans, times, "プラン")

        days, day_times, readings, reading_times = [], [], [], []
        days_by_plan = {}
        for plan, moment, count in zip(plans, times, day_counts):
            for number in range(1, count + 1):
                locale = self._locale()
                day = PlanDay(
                    plan=plan,
                    number=number,
                    # 題も文章も無い日を混ぜる（書きかけのプランの見え方の確認）。
                    title=(
                        "" if self.rng.random() < 0.2
                        else self.rng.choice(locale.PLAN_DAY_TITLES)
                    ),
                    devotional=(
                        "" if self.rng.random() < 0.15
                        else self.rng.choice(locale.PLAN_DEVOTIONALS)
                    ),
                )
                days.append(day)
                day_times.append(moment)
                days_by_plan.setdefault(plan.id, []).append(day)

                # 1 日に読む章は 1〜10（上限どおり）。1 割の日は外典を必ず混ぜる。
                wanted = self.rng.choice([1, 1, 1, 2, 2, 3, 4, 10])
                entries = [self.rng.choice(self.catalog) for _ in range(wanted)]
                if self.apocrypha and self.rng.random() < 0.25:
                    entries[-1] = self.rng.choice(self.apocrypha)
                for order, entry in enumerate(entries):
                    chapter_number = self.rng.choice(entry["chapters"])[0]
                    readings.append(PlanDayReading(
                        day=day,
                        canonical_book_id=entry["id"],
                        chapter_number=chapter_number,
                        # あえて訳を指定する日を作る（原文で読ませる日など）。
                        translation=(
                            self.rng.choice(entry["translations"])
                            if self.rng.random() < 0.2 else ""
                        ),
                        order=order,
                    ))
                    reading_times.append(moment)
        self._save(PlanDay, days, day_times, "プランの日")
        self._save(PlanDayReading, readings, reading_times, "プランの読む章")

        # 購読。人気の差を作り、読者ゼロのプランも必ず残す。
        public_plans = [p for p in plans if p.visibility != Plan.VISIBILITY_PRIVATE]
        subscriptions, subscription_times = [], []
        for index, plan in enumerate(public_plans):
            if index % 7 == 0:
                continue  # 読者ゼロのプラン（日の並べ替えができる状態）
            wanted = min(self.rng.choice([1, 2, 3, 5, 8, 13, 21, 40]), len(people))
            for user in self.rng.sample(people, wanted):
                subscriptions.append(PlanSubscription(
                    user=user,
                    plan=plan,
                    is_active=self.rng.random() > 0.15,
                ))
                subscription_times.append(self._past(bias=3.0))
        # 管理者は 5 本読んでいる状態にする。
        for plan in [p for p in public_plans if p.owner_id != admin.id][:5]:
            if not any(
                s.user_id == admin.id and s.plan_id == plan.id for s in subscriptions
            ):
                subscriptions.append(
                    PlanSubscription(user=admin, plan=plan, is_active=True)
                )
                subscription_times.append(self._past(bias=3.0))
        # 同じ人が同じプランを二重に読むことはないので、重複を落としてから入れる。
        unique, unique_times, seen = [], [], set()
        for subscription, moment in zip(subscriptions, subscription_times):
            key = (subscription.user_id, subscription.plan_id)
            if key in seen:
                continue
            seen.add(key)
            unique.append(subscription)
            unique_times.append(moment)
        PlanSubscription.objects.bulk_create(unique, batch_size=1000)
        for subscription, moment in zip(unique, unique_times):
            subscription.created_at = moment
            subscription.updated_at = moment
            subscription.started_at = moment
        PlanSubscription.objects.bulk_update(
            unique, ["created_at", "updated_at", "started_at"], batch_size=500
        )
        self.counts["プランの購読"] = len(unique)

        # 進捗。未着手・途中・完走を混ぜる。
        progress, progress_times = [], []
        for subscription, moment in zip(unique, unique_times):
            plan_days = days_by_plan.get(subscription.plan_id, [])
            if not plan_days:
                continue
            ratio = self.rng.choice([0.0, 0.0, 0.2, 0.4, 0.6, 0.9, 1.0])
            done = int(len(plan_days) * ratio)
            for day in plan_days[:done]:
                progress.append(PlanDayProgress(subscription=subscription, day=day))
                progress_times.append(self._after(moment, max_days=120))
        self._save(PlanDayProgress, progress, progress_times, "プランの進捗")
        self.stdout.write(
            f"  プラン {len(plans)} 件 / 日 {len(days)} 件 / 購読 {len(unique)} 件"
        )

    # ── 通知・通報 ──────────────────────────────────────────────────────────

    def _seed_notifications(self, people, admin, comments, answers, project_comments):
        """通知。返信・投票・メンション・Q&A の回答・翻訳の議論をすべて入れる。"""
        by_id = {comment.id: comment for comment in comments}
        objects, times = [], []

        def add(recipient_id, actor_id, kind, moment, **target):
            if recipient_id == actor_id:
                return
            objects.append(Notification(
                recipient_id=recipient_id,
                actor_id=actor_id,
                notification_type=kind,
                is_read=self.rng.random() < 0.55,
                **target,
            ))
            times.append(moment)

        replies = [c for c in comments if c.parent_id and not c.is_deleted]
        for reply in replies:
            parent = by_id.get(reply.parent_id)
            if parent:
                add(
                    parent.user_id, reply.user_id, Notification.REPLY,
                    reply.created_at, comment=reply,
                )

        voted = Vote.objects.values_list("comment__user_id", "user_id", "comment_id")[
            :20000
        ]
        for owner_id, voter_id, comment_id in voted:
            if self.rng.random() < 0.35:
                add(
                    owner_id, voter_id, Notification.UPVOTE,
                    self._past(bias=3.0), comment_id=comment_id,
                )

        alive = [c for c in comments if not c.is_deleted]
        for comment in self.rng.sample(alive, min(400, len(alive))):
            add(
                self.rng.choice(people).id, comment.user_id, Notification.MENTION,
                comment.created_at, comment=comment,
            )

        for answer in answers:
            if not answer.is_deleted and self.rng.random() < 0.8:
                add(
                    answer.question.user_id, answer.user_id, Notification.REPLY,
                    answer.created_at, answer=answer,
                )

        for discussion in project_comments:
            if self.rng.random() < 0.2:
                add(
                    discussion.project.owner_id, discussion.user_id,
                    Notification.REPLY, discussion.created_at,
                    translation_comment=discussion,
                )

        # 管理者宛の通知を厚めにする（未読タブが複数ページになるように）。
        for comment in self.rng.sample(alive, min(200, len(alive))):
            objects.append(Notification(
                recipient=admin,
                actor_id=comment.user_id,
                notification_type=self.rng.choice(
                    [Notification.REPLY, Notification.UPVOTE, Notification.MENTION]
                ),
                comment=comment,
                is_read=self.rng.random() < 0.3,
            ))
            times.append(self._past(bias=3.0))

        self._save(Notification, objects, times, "通知")
        self.stdout.write(f"  通知 {len(objects)} 件")

    def _seed_reports(self, people, comments, questions, answers):
        """通報。コメント・質問・回答の 3 種、理由 4 種をすべて使う。"""
        reasons = [Report.SPAM, Report.OFFENSIVE, Report.MISINFORMATION, Report.OTHER]
        alive = [c for c in comments if not c.is_deleted]
        objects, times, seen = [], [], set()
        wanted = self.scale["reports"]
        pools = [("comment", alive), ("question", questions), ("answer", answers)]
        for index in range(wanted):
            field, pool = pools[index % len(pools)]
            if not pool:
                continue
            target = self.rng.choice(pool)
            reporter = self.rng.choice(people)
            if reporter.id == target.user_id:
                continue
            key = (field, target.id, reporter.id)
            if key in seen:
                continue
            seen.add(key)
            objects.append(Report(
                reporter=reporter,
                reason=self.rng.choice(reasons),
                **{f"{field}_id": target.id},
            ))
            times.append(self._past())
        self._save(Report, objects, times, "通報")
        self.stdout.write(f"  通報 {len(objects)} 件")

    # ── 結果の表示 ──────────────────────────────────────────────────────────

    def _report(self, admin, admin_password, user_password, article_comments):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("シードの投入が終わりました"))
        for label, count in self.counts.items():
            self.stdout.write(f"  {label}: {count:,} 件")
        self.stdout.write("")
        self.stdout.write(f"  管理者: {admin.username}")
        if admin_password:
            self.stdout.write(
                self.style.WARNING(f"  管理者のパスワード（今だけ表示）: {admin_password}")
            )
        else:
            self.stdout.write("  管理者は既にあったので、パスワードは変えていません")
        self.stdout.write(
            self.style.WARNING(f"  シード利用者の共通パスワード: {user_password}")
        )
