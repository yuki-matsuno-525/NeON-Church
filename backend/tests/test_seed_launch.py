"""
seed_launch（公開前の運営の投稿）のテスト。

1. 中身の点検 … 手で書いた箇所が、リポジトリにある聖書・解釈書のデータに実在するか。
   文字数・タグ・1 日の章数などの上限を超えていないか。DB を使わずに確かめる。
   本番で「見つかりません」と出る投稿を、公開前にここで止めるため。
2. コマンドの動き … 小さな聖書データで実際に流し、運営アカウント・投稿ができること、
   DB に無い箇所は飛ばすこと、二重投入を止めること、--replace / --dry-run の動きを確かめる。
"""

import gzip
import json
import re
from functools import lru_cache
from pathlib import Path

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

from articles.citations import parse_body, parse_reference
from articles.models import INITIAL_TAGS, Article, ArticleCitation
from bible.models import Chapter, Verse
from comments.models import PREDEFINED_TAGS, Comment
from common.launch_content import ACCOUNTS, ARTICLES, PLANS, PROJECTS, QUESTIONS, THREADS
from plans.models import MAX_DAYS_PER_PLAN, MAX_READINGS_PER_DAY, Plan, PlanDay, PlanDayReading
from qa.models import Answer, Question
from tests.factories import make_book, make_comment
from translations.models import TranslationComment, TranslationProject, TranslationUnit

User = get_user_model()

BACKEND = Path(__file__).resolve().parent.parent
SEED = BACKEND / "bible" / "seed"


# ── リポジトリのデータから「実在する箇所」の表を作る ─────────────────────────


@lru_cache(maxsize=1)
def _bible():
    """slug → {章: {節番号}}。KJV（66 書）と、それ以外の書の JSON から作る。"""
    canonical = json.loads((BACKEND / "bible" / "data" / "canonical_books.json").read_text("utf-8"))
    kjv_slugs = [entry["slug"] for entry in canonical if any(b["translation"] == "KJV" for b in entry["books"])]
    # KJV の書の並び（=001 Genesis … =127 Revelation）は canonical_books.json の並びと違うので、
    # 見出しの番号から slug を引く。
    order = (
        "genesis exodus leviticus numbers deuteronomy joshua judges ruth 1-samuel 2-samuel 1-kings "
        "2-kings 1-chronicles 2-chronicles ezra nehemiah esther job psalms proverbs ecclesiastes "
        "song-of-songs isaiah jeremiah lamentations ezekiel daniel hosea joel amos obadiah jonah micah "
        "nahum habakkuk zephaniah haggai zechariah malachi matthew mark luke john acts romans "
        "1-corinthians 2-corinthians galatians ephesians philippians colossians 1-thessalonians "
        "2-thessalonians 1-timothy 2-timothy titus philemon hebrews james 1-peter 2-peter 1-john 2-john "
        "3-john jude revelation"
    ).split()
    assert sorted(order) == sorted(kjv_slugs)

    books = {}
    slug = None
    for line in (SEED / "ibibles" / "kjv.txt").read_text("utf-8-sig").splitlines():
        header = re.match(r"=(\d{3}) ", line)
        if header:
            n = int(header[1])
            slug = None if n == 0 else order[n - 1 if n < 100 else 39 + n - 101]
            continue
        verse = re.match(r"\S+ (\d+):(\d+) ", line)
        if verse and slug:
            books.setdefault(slug, {}).setdefault(int(verse[1]), set()).add(int(verse[2]))
    for path in (SEED / "others").glob("*.json"):
        data = json.loads(path.read_text("utf-8"))
        books[path.stem] = {c["number"]: {v["number"] for v in c["verses"]} for c in data["chapters"]}
    return books


@lru_cache(maxsize=1)
def _works():
    """解釈書の slug → {章: 区切りの数}。"""
    works = {}
    for path in (BACKEND / "commentary" / "seed").glob("*.json.gz"):
        with gzip.open(path, "rt", encoding="utf-8") as f:
            data = json.load(f)
        works[data["slug"]] = {c["number"]: len(c["sections"]) for c in data["chapters"]}
    return works


@lru_cache(maxsize=1)
def _translations():
    """slug → その書が持つ訳の名前（Book.translation の値）。"""
    canonical = json.loads((BACKEND / "bible" / "data" / "canonical_books.json").read_text("utf-8"))
    names = {entry["slug"]: {b["translation"] for b in entry["books"]} for entry in canonical}
    for path in (SEED / "others").glob("*.json"):
        names.setdefault(path.stem, set()).add(json.loads(path.read_text("utf-8"))["translation"])
    return names


def _missing(ref):
    """箇所が実在しなければ理由を返す。実在すれば None。"""
    slug, _, rest = ref.partition(" ")
    if not rest:
        parsed = {"commentary": slug.startswith("@"), "book_slug": slug.lstrip("@"),
                  "chapter_number": None, "verse_number_start": None, "verse_number_end": None}
    else:
        parsed = parse_reference(ref)
        if parsed is None:
            return "書き方が読めない"
    chapter = parsed["chapter_number"]
    start, end = parsed["verse_number_start"], parsed["verse_number_end"]
    if parsed["commentary"]:
        work = _works().get(parsed["book_slug"])
        if work is None:
            return "解釈書が無い"
        if chapter is not None and chapter not in work:
            return "章が無い"
        if start is not None and end > work[chapter]:
            return "区切りが無い"
        return None
    book = _bible().get(parsed["book_slug"])
    if book is None:
        return "書が無い"
    if chapter is not None and chapter not in book:
        return "章が無い"
    if start is not None:
        verses = book[chapter]
        if start not in verses or end not in verses:
            return "節が無い"
    return None


def _all_comments():
    stack = list(THREADS)
    while stack:
        item = stack.pop()
        yield item
        stack.extend(item.get("replies", []))


# ── 1. 中身の点検 ──────────────────────────────────────────────────────────


class TestLaunchContent:
    def test_every_place_exists_in_the_repository_data(self):
        refs = [("コメント", t["ref"]) for t in THREADS]
        refs += [("Q&A", q["ref"]) for q in QUESTIONS]
        refs += [
            (f"プラン「{p['title']}」", reading.partition("|")[0])
            for p in PLANS for day in p["days"] for reading in day["readings"]
        ]
        for article in ARTICLES:
            for item in parse_body(article["body"]):
                ref = f"{'@' if item['commentary'] else ''}{item['book_slug']} {item['chapter_number']}"
                if item["verse_number_start"] is not None:
                    ref += f":{item['verse_number_start']}-{item['verse_number_end']}"
                refs.append((f"記事「{article['title']}」", ref))
        broken = [f"{where}: {ref}（{why}）" for where, ref in refs if (why := _missing(ref))]
        assert broken == []

    def test_every_citation_mark_is_readable(self):
        """本文の [[…]] / {{…}} は全部読める書式で書く（読めない印は索引に載らず「見つかりません」になる）。"""
        unreadable = []
        for article in ARTICLES:
            body = article["body"]
            marks = re.findall(r"\[\[([^\[\]\n]+)\]\]|\{\{([^{}\n]+)\}\}", body)
            parsed = {item["raw"] for item in parse_body(body)}
            for inline, block in marks:
                raw = f"[[{inline}]]" if inline else f"{{{{{block}}}}}"
                if raw not in parsed:
                    unreadable.append(f"{article['title']}: {raw}")
        assert unreadable == []

    def test_pinned_translations_exist_for_the_book(self):
        pins = [
            reading.split(" ")[0] + "|" + reading.partition("|")[2]
            for p in PLANS for day in p["days"] for reading in day["readings"] if "|" in reading
        ]
        pins += [
            f"{item['book_slug']}|{item['translation']}"
            for article in ARTICLES for item in parse_body(article["body"]) if item["translation"]
        ]
        wrong = [pin for pin in pins if pin.partition("|")[2] not in _translations()[pin.partition("|")[0]]]
        assert wrong == []

    def test_authors_are_operator_accounts(self):
        authors = {item["author"] for item in _all_comments()}
        authors |= {q["author"] for q in QUESTIONS}
        authors |= {a["author"] for q in QUESTIONS for a in q.get("answers", [])}
        authors |= {a["author"] for a in ARTICLES} | {p["author"] for p in PLANS}
        authors |= {p["author"] for p in PROJECTS}
        assert authors <= set(ACCOUNTS)

    def test_accounts_say_they_are_run_by_the_site_and_use_ai(self):
        for spec in ACCOUNTS.values():
            assert spec["username"].startswith("NeONChurch")
            assert "AI" in spec["bio"]
            assert len(spec["bio"]) <= 500
        assert len({spec["username"] for spec in ACCOUNTS.values()}) == len(ACCOUNTS)

    def test_lengths_and_limits(self):
        tag_slugs = {slug for _name, slug in INITIAL_TAGS}
        comment_tags = {name for name, _label in PREDEFINED_TAGS}
        for article in ARTICLES:
            assert len(article["title"]) <= 200 and len(article["summary"].strip()) <= 300
            assert article["summary"].strip(), article["title"]  # 公開する記事は要約が必須
            assert len(article["tags"]) <= 3 and set(article["tags"]) <= tag_slugs
        for plan in PLANS:
            assert len(plan["title"]) <= 200 and len(plan["description"]) <= 300
            assert 1 <= len(plan["days"]) <= MAX_DAYS_PER_PLAN
            for day in plan["days"]:
                assert 1 <= len(day["readings"]) <= MAX_READINGS_PER_DAY, (plan["title"], day.get("title"))
                assert len(day.get("title", "")) <= 200
        for item in _all_comments():
            assert len(item["body"].strip()) <= 5000
            assert set(item.get("tags", [])) <= comment_tags
        for q in QUESTIONS:
            assert len(q["title"]) <= 200 and len(q["body"].strip()) <= 5000
            assert set(q.get("tags", [])) <= comment_tags
            assert sum(bool(a.get("best")) for a in q.get("answers", [])) <= 1
            assert all(len(a["body"].strip()) <= 5000 for a in q.get("answers", []))

    def test_translation_units_point_at_real_verses(self):
        for project in PROJECTS:
            slug, translation = project["source"]
            assert translation in _translations()[slug]
            verses = _bible()[slug]
            for key in project["units"]:
                chapter, verse = map(int, key.split(":"))
                assert verse in verses.get(chapter, set()), (project["name"], key)

    def test_no_duplicate_titles(self):
        for items in (ARTICLES, PLANS, QUESTIONS):
            titles = [item["title"] for item in items]
            assert len(titles) == len(set(titles))


# ── 2. コマンドの動き ───────────────────────────────────────────────────────


def _book(name, translation, order, slug, chapters, verses):
    book = make_book(name, translation, order, slug=slug)
    first = 0 if slug == "thomas" else 1
    for number in range(first, first + chapters):
        chapter = Chapter.objects.create(book=book, number=number)
        Verse.objects.bulk_create(
            Verse(chapter=chapter, number=v, text=f"{slug} {number}:{v}") for v in range(1, verses + 1)
        )
    return book


@pytest.fixture
def scripture(db):
    """本番の一部だけが入った状態。ここに無い箇所の投稿は飛ばされるはず。"""
    _book("Genesis", "KJV", 1, "genesis", 7, 40)
    _book("創世記", "口語訳", 1, "genesis", 7, 40)
    _book("John", "KJV", 2, "john", 21, 50)
    _book("The Book of Enoch", "R. H. Charles (EN)", 3, "enoch", 2, 9)
    _book("The Gospel of Thomas", "Mark M. Mattison (EN)", 4, "thomas", 12, 2)


@pytest.mark.django_db
class TestSeedLaunchCommand:
    def run(self, *args):
        from io import StringIO

        out = StringIO()
        call_command("seed_launch", *args, stdout=out)
        return out.getvalue()

    def test_creates_accounts_and_content(self, scripture):
        output = self.run()

        operators = User.objects.filter(username__in=[s["username"] for s in ACCOUNTS.values()])
        assert operators.count() == len(ACCOUNTS)
        assert not operators.filter(is_staff=True).exists()
        assert not operators.filter(is_superuser=True).exists()
        # 新しく作ったアカウントのパスワードは一度だけ表示する
        for spec in ACCOUNTS.values():
            assert spec["username"] in output

        # 記事とプランは全部入る（引用やプランの章が欠けても、記事・プラン自体は作る）
        assert Article.objects.filter(visibility=Article.VISIBILITY_PUBLIC).count() == len(ARTICLES)
        assert Plan.objects.filter(visibility=Plan.VISIBILITY_PUBLIC).count() == len(PLANS)
        assert ArticleCitation.objects.filter(canonical_book__slug="genesis").exists()
        year = Plan.objects.get(title="The Bible in a Year (66 books)")
        assert PlanDay.objects.filter(plan=year).count() == 365
        # DB に無い書の章は読む章にならない
        assert set(
            PlanDayReading.objects.values_list("canonical_book__slug", flat=True).distinct()
        ) <= {"genesis", "john", "enoch", "thomas"}

        # コメントは DB にある箇所の分だけ。返信も付く
        genesis_3 = Comment.objects.get(canonical_book__slug="genesis", chapter_number=3, verse_number=1, parent=None)
        assert genesis_3.replies.count() == 4
        assert genesis_3.tags.filter(name="考察").exists()
        assert not Comment.objects.exclude(
            canonical_book__slug__in=["genesis", "john", "enoch", "thomas"]
        ).exists()

        # Q&A: 解決済みの質問はベストアンサーを持つ
        solved = Question.objects.get(title="Which translation should I start with?")
        assert solved.best_answer is not None
        assert solved.best_answer.user.username == ACCOUNTS["guides"]["username"]
        assert Answer.objects.filter(question__title="Why are there two creation stories in Genesis 1 and 2?").exists()

        # 翻訳: 書の全節がユニットになり、訳した節だけ本文と状態を持つ
        enoch = TranslationProject.objects.get(source_book__canonical_book__slug="enoch")
        assert enoch.status == TranslationProject.STATUS_ACTIVE
        assert enoch.units.count() == 18
        assert enoch.units.filter(status=TranslationUnit.STATUS_DONE).count() == 9
        assert enoch.units.filter(status=TranslationUnit.STATUS_TODO, body="").count() == 6
        assert enoch.memberships.filter(user=enoch.owner, role="owner", status="approved").exists()
        assert TranslationComment.objects.filter(project=enoch).count() >= 1

        # 飛ばした箇所は一覧で知らせる
        assert "飛ばしました" in output

    def test_refuses_to_run_twice(self, scripture):
        self.run()
        with pytest.raises(CommandError, match="--replace"):
            self.run()
        assert Article.objects.count() == len(ARTICLES)

    def test_replace_keeps_other_peoples_posts(self, scripture):
        self.run()
        reader = User.objects.create_user(username="reader", password="pw-12345678")
        from bible.models import Book

        genesis = Book.objects.get(canonical_book__slug="genesis", translation="KJV")
        own = make_comment(user=reader, book=genesis, body="私のコメント")
        output = self.run("--replace")

        assert Comment.objects.filter(pk=own.pk).exists()
        assert Article.objects.count() == len(ARTICLES)
        assert Plan.objects.count() == len(PLANS)
        # 入れ直しではアカウントを作らないので、パスワードは表示しない
        assert "パスワード" not in output

    def test_dry_run_writes_nothing(self, scripture):
        output = self.run("--dry-run")
        assert "dry-run" in output
        assert not User.objects.filter(username=ACCOUNTS["official"]["username"]).exists()
        assert Article.objects.count() == 0
        assert Comment.objects.count() == 0

    def test_needs_scripture(self, db):
        with pytest.raises(CommandError, match="聖書データ"):
            self.run()
