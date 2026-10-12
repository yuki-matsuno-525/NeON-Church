"""
公開前に入れておく「運営の投稿」を入れる。

    python manage.py seed_launch            # 運営アカウントを用意して、投稿を入れる
    python manage.py seed_launch --replace  # 運営の投稿を消してから入れ直す
    python manage.py seed_launch --dry-run  # 何が入るか・どの箇所が見つからないかだけ確かめる

seed_demo（目視確認用の架空データ）とは別物。こちらは本番に残し続ける本物の投稿で、
文章はすべて common/launch_content/ に手で書いてある。乱数は使わない。

投稿者は運営アカウント 3 つだけ（launch_content/accounts.py）。架空の一般ユーザーは作らない。
投票・お気に入り・通知も作らない（運営が自分で票を入れたように見せないため）。

本番に何の書・解釈書が入っているかは決め打ちしない。書いた箇所が DB に無ければ、
その投稿（またはその読む章）だけ飛ばして、最後に一覧で知らせる。
"""

import secrets
import string
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from articles.citations import parse_reference, sync_citations
from articles.models import Article, ArticleTag
from bible.models import Book, Verse
from comments.models import Comment, Tag
from commentary.models import Section, Work
from common.launch_content import (
    ACCOUNTS,
    ARTICLES,
    PLANS,
    PROJECTS,
    QUESTIONS,
    THREADS,
)
from plans.models import MAX_DAYS_PER_PLAN, MAX_READINGS_PER_DAY, Plan, PlanDay, PlanDayReading
from qa.models import Answer, Question
from translations.models import (
    TranslationComment,
    TranslationMembership,
    TranslationProject,
    TranslationUnit,
)

User = get_user_model()

# 投稿を過去何日に並べるか。全部が同じ時刻だと一覧の並びが決まらないので、
# 書いた順（先頭がいちばん新しい）に少しずつずらす。
WINDOW_DAYS = 21

# 訳を書いていない投稿は、言語ごとにこの訳で書いたことにする（書名の出し方に使うだけ）。
DEFAULT_TRANSLATION = {"en": "KJV", "ja": "口語訳"}


class Command(BaseCommand):
    help = "公開前の運営の投稿（記事・プラン・コメント・Q&A・翻訳）を入れる"

    def add_arguments(self, parser):
        parser.add_argument(
            "--replace",
            action="store_true",
            help=(
                "運営アカウントの投稿を消してから入れ直す。"
                "運営の投稿に付いた他の人の返信・回答・購読も一緒に消えるので注意"
            ),
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="DB を変えずに、入る件数と見つからない箇所だけを表示する",
        )

    # ── 入口 ────────────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        self.now = timezone.now()
        self.counts = {}
        self.skipped = []
        self.passwords = {}
        self._load_places()

        try:
            with transaction.atomic():
                self.accounts = self._ensure_accounts()
                self._guard_existing(options["replace"])
                self._seed_comments()
                self._seed_questions()
                self._seed_articles()
                self._seed_plans()
                self._seed_projects()
                if options["dry_run"]:
                    raise _DryRun()
        except _DryRun:
            self.passwords = {}
            self.stdout.write(self.style.WARNING("--dry-run なので DB は元に戻しました"))

        self._report()

    # ── 下ごしらえ ──────────────────────────────────────────────────────────

    def _load_places(self):
        """DB にある書・章・節と解釈書を控える（箇所が実在するかの判定に使う）。"""
        self.books = {}
        for book in Book.objects.select_related("canonical_book"):
            entry = self.books.setdefault(
                book.canonical_book.slug,
                {"id": book.canonical_book_id, "translations": set(), "chapters": {}},
            )
            entry["translations"].add(book.translation)
        # 章ごとの最大節番号。訳によって章立てが違うことがあるので、どれかの訳にあれば「ある」とする。
        rows = (
            Verse.objects.values("chapter__book__canonical_book__slug", "chapter__number")
            .annotate(max_number=Max("number"))
        )
        for row in rows:
            chapters = self.books[row["chapter__book__canonical_book__slug"]]["chapters"]
            chapter = row["chapter__number"]
            chapters[chapter] = max(chapters.get(chapter, 0), row["max_number"])

        self.works = {}
        for work in Work.objects.all():
            self.works[work.slug] = {"id": work.id, "chapters": {}}
        rows = (
            Section.objects.values("work__slug", "chapter_number")
            .annotate(max_number=Max("number"))
        )
        for row in rows:
            self.works[row["work__slug"]]["chapters"][row["chapter_number"]] = row["max_number"]

        if not self.books:
            raise CommandError(
                "聖書データが入っていません。先に import 系のコマンドを実行してください。"
            )

    def _place(self, ref, where):
        """
        "genesis" / "genesis 3" / "genesis 3:1" / "@calvin-romans 8" を箇所の列に直す。
        DB に無い箇所なら None を返し、飛ばしたことを控える。
        """
        slug, _, rest = ref.strip().partition(" ")
        if not rest:
            parsed = {
                "commentary": slug.startswith("@"),
                "book_slug": slug.lstrip("@"),
                "chapter_number": None,
                "verse_number_start": None,
                "translation": "",
            }
        else:
            parsed = parse_reference(ref)
        if parsed is None:
            raise CommandError(f"{where}: 箇所の書き方が読めません: {ref!r}")

        table = self.works if parsed["commentary"] else self.books
        entry = table.get(parsed["book_slug"])
        chapter = parsed["chapter_number"]
        verse = parsed["verse_number_start"]
        found = entry is not None and (
            chapter is None
            or (chapter in entry["chapters"] and (verse is None or verse <= entry["chapters"][chapter]))
        )
        if not found:
            self.skipped.append(f"{where}: {ref}")
            return None
        place = {
            "chapter_number": chapter,
            "verse_number": verse,
        }
        if parsed["commentary"]:
            place["commentary_work_id"] = entry["id"]
        else:
            place["canonical_book_id"] = entry["id"]
        return place

    def _translation(self, ref, lang, wanted=""):
        """その書が持っている訳から、投稿時の訳（書名の出し方）を決める。"""
        if ref.startswith("@"):
            return None
        available = self.books[ref.split(" ")[0]]["translations"]
        for name in (wanted, DEFAULT_TRANSLATION.get(lang, ""), "KJV", "口語訳"):
            if name and name in available:
                return name
        return sorted(available)[0]

    def _ensure_accounts(self):
        """運営アカウントを用意する。既にあれば自己紹介だけ書き直し、パスワードは触らない。"""
        accounts = {}
        for key, spec in ACCOUNTS.items():
            user = User.objects.filter(username=spec["username"]).first()
            if user is None:
                password = self._random_password()
                user = User.objects.create_user(
                    username=spec["username"],
                    email=spec.get("email", ""),
                    password=password,
                    bio=spec["bio"],
                )
                self.passwords[spec["username"]] = password
            elif user.bio != spec["bio"]:
                user.bio = spec["bio"]
                user.save(update_fields=["bio", "updated_at"])
            accounts[key] = user
        return accounts

    def _guard_existing(self, replace):
        """運営の投稿が既にあるなら、--replace のときだけ消す。無いならそのまま。"""
        users = list(self.accounts.values())
        owned = {
            "コメント": Comment.objects.filter(user__in=users),
            "Q&A の質問": Question.objects.filter(user__in=users),
            "Q&A の回答": Answer.objects.filter(user__in=users),
            "記事": Article.objects.filter(owner__in=users),
            "プラン": Plan.objects.filter(owner__in=users),
            "翻訳プロジェクト": TranslationProject.objects.filter(owner__in=users),
        }
        existing = {label: qs.count() for label, qs in owned.items()}
        if not any(existing.values()):
            return
        if not replace:
            summary = "、".join(f"{label} {n} 件" for label, n in existing.items() if n)
            raise CommandError(
                f"運営の投稿が既にあります（{summary}）。二重に入らないよう止めました。"
                "入れ直すなら --replace を付けてください。"
            )
        # 返信・回答が親より先に消えるよう、子の側から消す。
        for label in ("Q&A の回答", "Q&A の質問", "コメント", "記事", "プラン", "翻訳プロジェクト"):
            owned[label].delete()
        self.stdout.write("運営の投稿を消しました（入れ直します）")

    def _random_password(self):
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(20))

    # ── 時刻 ────────────────────────────────────────────────────────────────

    def _moment(self, index, total):
        """先頭がいちばん新しくなるように、過去 WINDOW_DAYS 日へ等間隔に並べる。"""
        fraction = (index + 1) / (total + 1)
        return self.now - timedelta(days=WINDOW_DAYS * fraction)

    def _later(self, moment, steps):
        """返信・回答の時刻。親より後、ただし今より前。"""
        return min(moment + timedelta(hours=3 * steps), self.now - timedelta(minutes=5))

    def _stamp(self, obj, moment):
        """作成日時は保存時に自動で「今」が入るので、保存後に update で上書きする。"""
        type(obj).objects.filter(pk=obj.pk).update(created_at=moment, updated_at=moment)

    def _count(self, label, n=1):
        self.counts[label] = self.counts.get(label, 0) + n

    # ── コメント ────────────────────────────────────────────────────────────

    def _seed_comments(self):
        tags = {name: Tag.objects.get_or_create(name=name)[0] for name in _all_tags(THREADS)}
        for index, thread in enumerate(THREADS):
            place = self._place(thread["ref"], "コメント")
            if place is None:
                continue
            moment = self._moment(index, len(THREADS))
            self._add_comment(thread, place, moment, None, tags, thread["ref"])

    def _add_comment(self, item, place, moment, parent, tags, ref, depth=0):
        lang = item.get("lang", "en")
        comment = Comment.objects.create(
            user=self.accounts[item["author"]],
            parent=parent,
            body=item["body"].strip(),
            source_translation=self._translation(ref, lang, item.get("translation", "")),
            **place,
        )
        comment.tags.set([tags[name] for name in item.get("tags", [])])
        self._stamp(comment, moment)
        self._count("コメント" if parent is None else "コメントの返信")
        for step, reply in enumerate(item.get("replies", []), start=1):
            self._add_comment(
                reply, place, self._later(moment, step), comment, tags, ref, depth + 1
            )

    # ── Q&A ─────────────────────────────────────────────────────────────────

    def _seed_questions(self):
        tags = {name: Tag.objects.get_or_create(name=name)[0] for name in _all_tags(QUESTIONS)}
        for index, item in enumerate(QUESTIONS):
            place = self._place(item["ref"], "Q&A")
            if place is None:
                continue
            moment = self._moment(index, len(QUESTIONS))
            lang = item.get("lang", "en")
            question = Question.objects.create(
                user=self.accounts[item["author"]],
                title=item["title"].strip(),
                body=item["body"].strip(),
                source_translation=self._translation(item["ref"], lang, item.get("translation", "")),
                **place,
            )
            question.tags.set([tags[name] for name in item.get("tags", [])])
            self._stamp(question, moment)
            self._count("Q&A の質問")
            for step, spec in enumerate(item.get("answers", []), start=1):
                answer = Answer.objects.create(
                    question=question,
                    user=self.accounts[spec["author"]],
                    body=spec["body"].strip(),
                )
                self._stamp(answer, self._later(moment, step))
                self._count("Q&A の回答")
                if spec.get("best"):
                    Question.objects.filter(pk=question.pk).update(best_answer=answer)

    # ── 記事 ────────────────────────────────────────────────────────────────

    def _seed_articles(self):
        tags = {tag.slug: tag for tag in ArticleTag.objects.all()}
        for index, item in enumerate(ARTICLES):
            article = Article.objects.create(
                owner=self.accounts[item["author"]],
                title=item["title"].strip(),
                summary=item["summary"].strip(),
                body=item["body"].strip(),
                visibility=Article.VISIBILITY_PUBLIC,
            )
            article.tags.set([tags[slug] for slug in item.get("tags", []) if slug in tags])
            sync_citations(article)
            self._check_citations(article, item["title"])
            self._stamp(article, self._moment(index, len(ARTICLES)))
            self._count("記事")

    def _check_citations(self, article, title):
        """本文の印のうち、DB に無い箇所を指しているものを控える（表示は「見つかりません」になる）。"""
        from articles.citations import parse_body

        for item in parse_body(article.body):
            prefix = "@" if item["commentary"] else ""
            chapter = item["chapter_number"]
            ref = f"{prefix}{item['book_slug']} {chapter}"
            if item["verse_number_start"] is not None:
                ref += f":{item['verse_number_start']}"
            self._place(ref, f"記事「{title}」の引用")

    # ── プラン ──────────────────────────────────────────────────────────────

    def _seed_plans(self):
        for index, item in enumerate(PLANS):
            if len(item["days"]) > MAX_DAYS_PER_PLAN:
                raise CommandError(f"プラン「{item['title']}」の日数が上限を超えています")
            plan = Plan.objects.create(
                owner=self.accounts[item["author"]],
                title=item["title"].strip(),
                description=item["description"].strip(),
                note=item.get("note", "").strip(),
                visibility=Plan.VISIBILITY_PUBLIC,
            )
            moment = self._moment(index, len(PLANS))
            for number, day_spec in enumerate(item["days"], start=1):
                if len(day_spec["readings"]) > MAX_READINGS_PER_DAY:
                    raise CommandError(
                        f"プラン「{item['title']}」第{number}日の章が上限を超えています"
                    )
                day = PlanDay.objects.create(
                    plan=plan,
                    number=number,
                    title=day_spec.get("title", "").strip(),
                    devotional=day_spec.get("devotional", "").strip(),
                )
                for order, reading in enumerate(day_spec["readings"]):
                    ref, _, translation = reading.partition("|")
                    place = self._place(ref, f"プラン「{item['title']}」第{number}日")
                    if place is None:
                        continue
                    PlanDayReading.objects.create(
                        day=day,
                        canonical_book_id=place.get("canonical_book_id"),
                        commentary_work_id=place.get("commentary_work_id"),
                        chapter_number=place["chapter_number"],
                        translation=self._pinned_translation(ref, translation),
                        order=order,
                    )
                    self._count("プランの読む章")
                self._stamp(day, moment)
                self._count("プランの日")
            self._stamp(plan, moment)
            self._count("プラン")

    def _pinned_translation(self, ref, translation):
        """訳を指定した日でも、その訳が DB に無ければ指定を外す（読む人の訳で開く）。"""
        if not translation or ref.startswith("@"):
            return ""
        if translation in self.books[ref.split(" ")[0]]["translations"]:
            return translation
        self.skipped.append(f"プランの訳の指定（外しました）: {ref}|{translation}")
        return ""

    # ── 翻訳プロジェクト ────────────────────────────────────────────────────

    def _seed_projects(self):
        for index, item in enumerate(PROJECTS):
            slug, translation = item["source"]
            book = Book.objects.filter(
                canonical_book__slug=slug, translation=translation
            ).first()
            if book is None:
                self.skipped.append(f"翻訳プロジェクト: {slug}（{translation}）")
                continue
            owner = self.accounts[item["author"]]
            moment = self._moment(index, len(PROJECTS))
            project = TranslationProject.objects.create(
                name=item["name"].strip(),
                description=item["description"].strip(),
                owner=owner,
                source_book=book,
                target_language=item["target_language"],
                status=item["status"],
            )
            TranslationMembership.objects.create(
                project=project,
                user=owner,
                role=TranslationMembership.ROLE_OWNER,
                status=TranslationMembership.STATUS_APPROVED,
            )
            # 書の全節をユニットにする（画面の「書を追加」と同じ）。訳した節だけ本文と状態を入れる。
            verses = Verse.objects.filter(chapter__book=book).values_list(
                "id", "chapter__number", "number"
            )
            done = item.get("units", {})
            units = []
            for verse_id, chapter, number in verses:
                status, body = done.get(f"{chapter}:{number}", (TranslationUnit.STATUS_TODO, ""))
                units.append(TranslationUnit(
                    project=project,
                    verse_id=verse_id,
                    body=body.strip(),
                    status=status,
                    assigned_to=owner if body else None,
                ))
            TranslationUnit.objects.bulk_create(units, batch_size=1000)
            self._count("翻訳ユニット", len(units))
            for step, body in enumerate(item.get("comments", []), start=1):
                comment = TranslationComment.objects.create(
                    project=project, user=owner, body=body.strip()
                )
                self._stamp(comment, self._later(moment, step))
                self._count("翻訳の議論")
            self._stamp(project, moment)
            self._count("翻訳プロジェクト")

    # ── 報告 ────────────────────────────────────────────────────────────────

    def _report(self):
        self.stdout.write("")
        for label, n in self.counts.items():
            self.stdout.write(f"  {label}: {n}")
        if self.skipped:
            self.stdout.write(self.style.WARNING(
                f"DB に無い箇所を {len(self.skipped)} 件飛ばしました:"
            ))
            for line in self.skipped:
                self.stdout.write(f"    {line}")
        if self.passwords:
            self.stdout.write(self.style.WARNING(
                "運営アカウントを作りました。パスワードは今だけ表示します（控えてください）:"
            ))
            for username, password in self.passwords.items():
                self.stdout.write(f"    {username}: {password}")
        self.stdout.write(self.style.SUCCESS("運営の投稿を入れ終わりました"))


class _DryRun(Exception):
    """--dry-run のとき、入れたものをまとめて取り消すための合図。"""


def _all_tags(items):
    """投稿（と返信）に付いているタグ名を全部集める。"""
    names = set()
    stack = list(items)
    while stack:
        item = stack.pop()
        names.update(item.get("tags", []))
        stack.extend(item.get("replies", []))
    return names
