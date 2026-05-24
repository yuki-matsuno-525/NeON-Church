"""
豊富なシードデータを投入する管理コマンド。
python manage.py seed         # シードデータを追加
python manage.py seed --clear # 既存データを削除してからシードを投入
"""

import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from bible.models import Book, Chapter, Verse
from bookmarks.models import Bookmark
from comments.models import Comment, Report, Tag, Vote
from notifications.models import Notification
from reading_progress.models import ReadingProgress
from translations.models import (
    TranslationComment,
    TranslationMembership,
    TranslationProject,
    TranslationUnit,
)

User = get_user_model()

# ── シードデータ定義 ──────────────────────────────────────────────────────

USERS = [
    {"username": "takeshi_yamada", "email": "takeshi@example.com", "bio": "毎朝聖書を読むことを日課にしています。マタイによる福音書が特に好きです。"},
    {"username": "hanako_suzuki", "email": "hanako@example.com", "bio": "神学を勉強中の大学院生です。原語（ギリシャ語・ヘブライ語）にも興味があります。"},
    {"username": "kenji_tanaka", "email": "kenji@example.com", "bio": "プロテスタント教会の牧師。聖書の解説や説教準備にこのサービスを使っています。"},
    {"username": "yuki_nakamura", "email": "yuki@example.com", "bio": "カトリック信者。日曜礼拝後にここでメモを共有しています。"},
    {"username": "satoshi_kobayashi", "email": "satoshi@example.com", "bio": "IT エンジニア兼クリスチャン。コードと同じくらい聖書も愛しています。"},
    {"username": "akiko_ito", "email": "akiko@example.com", "bio": "ホスピス看護師。患者さんと聖書の言葉を分かち合う機会が多いです。"},
    {"username": "hiroshi_watanabe", "email": "hiroshi@example.com", "bio": "聖書翻訳プロジェクトに参加しています。より分かりやすい日本語訳を目指して。"},
    {"username": "michiko_saito", "email": "michiko@example.com", "bio": "子どもたちに聖書を教えている主婦。わかりやすい言葉を探しています。"},
    {"username": "ryo_kato", "email": "ryo@example.com", "bio": "最近キリスト教に興味を持ち始めました。まだ勉強中ですが、ここの解説が役立っています。"},
    {"username": "natsuki_yamamoto", "email": "natsuki@example.com", "bio": "福音派の若者グループのリーダー。毎週聖書研究をしています。"},
    {"username": "taro_hayashi", "email": "taro@example.com", "bio": "聖書考古学に興味があります。歴史的背景から聖書を読むのが好きです。"},
    {"username": "yumi_inoue", "email": "yumi@example.com", "bio": "音楽礼拝のリーダー。詩篇の言葉から賛美歌の歌詞を作ることもあります。"},
    {"username": "daisuke_kimura", "email": "daisuke@example.com", "bio": "神学校の学生。組織神学を学びながら聖書全巻を通読しています。"},
    {"username": "eri_sato", "email": "eri@example.com", "bio": "インターナショナルチャーチのメンバー。英語版と日本語版を比べながら読んでいます。"},
    {"username": "makoto_abe", "email": "makoto@example.com", "bio": "長老教会の執事。聖書の深い意味を探求することが生きがいです。"},
]

COMMENT_BODIES_VERSE = [
    "この節は私の人生で何度も支えになりました。特に困難な時期に読み返しています。",
    "原語のニュアンスを考えると、「愛」はギリシャ語の「アガペー」で、無条件の愛を指しています。",
    "この言葉は山上の垂訓の核心部分ですね。イエスの教えの中で最も革命的な部分だと思います。",
    "先週の礼拝でこの節について説教がありました。牧師の解釈がとても印象的でした。",
    "子どもたちにこの節を教える時、いつも具体的な例を使って説明しています。",
    "ヘブライ語の「シャローム」は単なる平和ではなく、完全な幸福・繁栄を意味します。",
    "この節を読んで、先週起きた出来事を思い出しました。神様の摂理を感じました。",
    "注釈書によると、この背景には当時のユダヤ教の文脈があります。",
    "パウロがこれを書いた時の状況（投獄中）を考えると、より深く意味が伝わります。",
    "毎朝この節を声に出して読んでいます。一日の始まりに力をもらいます。",
    "この節の「光」というメタファーは、ヨハネ書簡全体のテーマと繋がっています。",
    "礼拝でこの箇所を暗記しました。今でも心に深く刻まれています。",
    "この節を読むたびに、神様の恵みの広さと深さを改めて感じます。",
    "文脈を見ると、イエスはここで具体的な聴衆（ファリサイ人）に向けて話しています。",
    "この節の直前と直後の文脈を一緒に読むと、意味がより明確になります。",
    "昨日の聖書研究でこの節について議論しました。様々な解釈があって興味深かったです。",
    "この言葉が書かれた時代背景を理解すると、当時の信徒への励ましとして読めます。",
    "老人ホームの礼拝でこの節を分かち合った時、参加者の方々が涙を流していました。",
    "この節は詩篇23篇と並んで、最も多くの人に愛されている聖書の言葉の一つです。",
    "クリスマスシーズンになるとこの節が特に心に響きます。",
]

COMMENT_BODIES_CHAPTER = [
    "この章全体のテーマは「信仰による義」ですね。ルターの宗教改革の核心でもあります。",
    "1章から読み通すと、著者がいかに丁寧に論証を積み上げているかがわかります。",
    "この章の構造を分析すると、ABABのキアスム構造になっているのが面白いです。",
    "聖書研究グループでこの章を3週間かけて読みました。毎回新しい発見があります。",
    "この章は難解ですが、デイビッド・ウィルコックスの注解書がとても参考になりました。",
]

COMMENT_BODIES_BOOK = [
    "マタイ福音書全体を通じて、「天の御国」というテーマが繰り返されています。",
    "この書物の著者についての歴史的議論は今でも続いていますが、内容の価値は変わりません。",
    "ヨハネ書簡は他の福音書と視点が大きく異なり、神学的に非常に深いです。",
]

QA_QUESTIONS = [
    "「山を動かす信仰」（マタイ17:20）は文字通りの意味ですか？比喩的な意味ですか？",
    "「汝の敵を愛せよ」を実践するための具体的な方法を教えてください。",
    "イエスが「わたしは道であり、真理であり、命である」と言った時、どんな意味があるのでしょうか？",
    "旧約聖書と新約聖書の神様は同じ神様なのに、なぜこんなに違って見えるのですか？",
    "「聖霊に対する冒涜」（マタイ12:31）とは具体的にどういう罪のことですか？",
]

QA_ANSWERS = [
    "比喩的な表現として理解するのが一般的です。信仰によって不可能に見えることも可能になるという意味です。",
    "具体的には、①相手のために祈る ②悪に悪で返さない ③できる範囲で善を行う、という段階的なアプローチが効果的です。",
    "ヨハネ14:6の文脈では、イエスが神に至る唯一の道であることを主張しています。これはキリスト教の排他性の根拠とされることもありますが、解釈は様々あります。",
    "これは神学的に「神の性質の一貫性」という問題に関わります。旧約の神も新約の神も同じですが、イエスを通じた新しい契約によって、神との関係が変わったと理解できます。",
    "これは聖霊の働きを意図的かつ継続的に拒絶することを指すと多くの神学者が解釈しています。単なる疑いや誤りではなく、意識的な拒絶です。",
]

REPORT_REASONS = ["spam", "offensive", "misinformation", "other"]

TRANSLATION_PROJECTS = [
    {
        "name": "現代語訳マタイ福音書プロジェクト",
        "description": "現代の日本語話者に親しみやすい言葉でマタイ福音書を翻訳します。難しい宗教用語を避け、日常会話で使われる表現を優先します。",
        "target_language": "ja",
        "status": "published",
        "book_slug": "matthew",
    },
    {
        "name": "ヨハネ福音書 やさしい日本語プロジェクト",
        "description": "外国にルーツを持つ方々や日本語学習者のために、ヨハネ福音書をやさしい日本語で翻訳します。",
        "target_language": "ja",
        "status": "active",
        "book_slug": "john",
    },
    {
        "name": "ローマ人への手紙 口語訳プロジェクト",
        "description": "パウロの神学的傑作であるローマ人への手紙を、現代の口語体で翻訳するプロジェクトです。",
        "target_language": "ja",
        "status": "draft",
        "book_slug": "romans",
    },
]

TRANSLATION_UNIT_BODIES = [
    "神は世を愛された。それほどに愛されたので、独り子をお与えになった。",
    "はじめに言があった。言は神とともにあった。言は神であった。",
    "わたしは道であり、真理であり、命である。",
    "あなたがたは世の光である。山の上にある町は隠れることができない。",
    "心の貧しい人たちは、幸いである、天の国はその人たちのものである。",
    "悲しむ人たちは、幸いである、その人たちは慰められる。",
    "柔和な人たちは、幸いである、その人たちは地を受け継ぐ。",
    "義に飢え渇いている人たちは、幸いである、その人たちは満たされる。",
    "憐れみ深い人たちは、幸いである、その人たちは憐れみを受ける。",
    "心の清い人たちは、幸いである、その人たちは神を見る。",
    "平和を実現する人たちは、幸いである、その人たちは神の子と呼ばれる。",
    "義のために迫害される人たちは、幸いである、天の国はその人たちのものである。",
    "愛は忍耐強い。愛は情け深い。ねたまない。愛は自慢せず、高ぶらない。",
    "主はわたしの羊飼い、わたしには何も欠けることがない。",
    "御言葉はわたしの道の光、わたしの歩みを照らす灯。",
]

TRANSLATION_COMMENT_BODIES = [
    "「愛されたので」の「愛」はアガペーで、無条件の愛を指します。翻訳に反映させたいですね。",
    "この節の「言」はロゴスの訳ですが、「ことば」とひらがなにした方が親しみやすいでしょうか？",
    "「道であり、真理であり、命である」は三つの属性を列挙していますが、接続詞の使い方を検討しましょう。",
    "「世の光」を「社会の灯り」に変えると意味が変わりすぎるかもしれません。",
    "「心の貧しい人」の「貧しい」は原語では霊的な貧しさを指すので、「霊において謙虚な人」の方が正確かもしれません。",
    "「柔和」は現代語では「おとなしい」や「穏やか」の方が伝わりやすいでしょう。",
    "「地を受け継ぐ」の「地」はエレツで、土地・大地を意味します。「大地を受け継ぐ」が適切でしょうか？",
    "「飢え渇いている」という強い表現は保持すべきだと思います。熱烈な願いを表しています。",
    "「忍耐強い」の原語はマクロテュメオで、長く耐え忍ぶという意味です。「長く待ち続ける」も検討できます。",
    "詩篇23篇の「羊飼い」は、当時の読者に強くイメージを喚起します。現代でも残すべきでしょう。",
]


class Command(BaseCommand):
    help = "豊富なシードデータを投入する"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="既存データを削除してからシードを投入する",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self._clear_data()

        with transaction.atomic():
            self._seed_tags()
            users = self._seed_users()
            books, chapters, verses = self._get_bible_data()
            comments = self._seed_comments(users, books, chapters, verses)
            self._seed_votes(users, comments)
            self._seed_bookmarks(users, verses, comments)
            self._seed_notifications(users, comments)
            self._seed_reading_progress(users, books, chapters)
            self._seed_translations(users, books, verses)

        self.stdout.write(self.style.SUCCESS("シードデータの投入が完了しました"))

    def _clear_data(self):
        self.stdout.write("既存データを削除しています...")
        TranslationComment.objects.all().delete()
        TranslationUnit.objects.all().delete()
        TranslationMembership.objects.all().delete()
        TranslationProject.objects.all().delete()
        Notification.objects.all().delete()
        Bookmark.objects.all().delete()
        ReadingProgress.objects.all().delete()
        Vote.objects.all().delete()
        Report.objects.all().delete()
        Comment.objects.all().delete()
        User.objects.filter(is_superuser=False, is_staff=False).exclude(username="admin").delete()
        self.stdout.write("削除完了")

    def _seed_tags(self):
        from comments.models import PREDEFINED_TAGS
        for name, _ in PREDEFINED_TAGS:
            Tag.objects.get_or_create(name=name)
        self.stdout.write(f"  タグ {len(PREDEFINED_TAGS)} 件")

    def _seed_users(self):
        users = []
        created = 0
        for data in USERS:
            user, is_new = User.objects.get_or_create(
                username=data["username"],
                defaults={
                    "email": data["email"],
                    "bio": data["bio"],
                },
            )
            if is_new:
                user.set_password("Seed@pass123")
                user.save(update_fields=["password"])
                created += 1
            users.append(user)
        self.stdout.write(f"  ユーザー {created} 件作成（既存含む合計 {len(users)} 件）")
        return users

    def _get_bible_data(self):
        books = list(Book.objects.prefetch_related("chapters__verses").order_by("order")[:10])
        if not books:
            self.stderr.write("  警告: 聖書データが存在しません。import_gospel を先に実行してください。")
            return [], [], []
        chapters = []
        verses = []
        for book in books:
            for chapter in book.chapters.all()[:5]:
                chapters.append(chapter)
                for verse in chapter.verses.all()[:10]:
                    verses.append(verse)
        self.stdout.write(f"  聖書データ: {len(books)} 書, {len(chapters)} 章, {len(verses)} 節")
        return books, chapters, verses

    def _seed_comments(self, users, books, chapters, verses):
        if not verses:
            self.stdout.write("  コメント: 聖書データなしのためスキップ")
            return []

        tags = list(Tag.objects.all())
        all_comments = []

        # 節コメント（各節に2〜4件）
        for verse in verses[:30]:
            num_comments = random.randint(2, 4)
            for i in range(num_comments):
                user = random.choice(users)
                body = random.choice(COMMENT_BODIES_VERSE)
                comment = Comment.objects.create(
                    user=user,
                    verse=verse,
                    body=body,
                    is_qa=False,
                )
                if tags and random.random() < 0.6:
                    selected_tags = random.sample(tags, k=random.randint(1, 2))
                    comment.tags.set(selected_tags)
                all_comments.append(comment)

        # 章コメント
        for chapter in chapters[:10]:
            for i in range(random.randint(1, 3)):
                user = random.choice(users)
                comment = Comment.objects.create(
                    user=user,
                    chapter=chapter,
                    body=random.choice(COMMENT_BODIES_CHAPTER),
                )
                if tags and random.random() < 0.5:
                    comment.tags.set(random.sample(tags, 1))
                all_comments.append(comment)

        # 書コメント
        for book in books[:5]:
            comment = Comment.objects.create(
                user=random.choice(users),
                book=book,
                body=random.choice(COMMENT_BODIES_BOOK),
            )
            all_comments.append(comment)

        # 返信ツリー（depth 3）
        top_level = [c for c in all_comments if c.verse is not None][:20]
        for parent in top_level:
            num_replies = random.randint(1, 4)
            for _ in range(num_replies):
                replier = random.choice([u for u in users if u != parent.user])
                reply = Comment.objects.create(
                    user=replier,
                    verse=parent.verse,
                    body=random.choice(COMMENT_BODIES_VERSE),
                    parent=parent,
                )
                all_comments.append(reply)
                # depth 2
                if random.random() < 0.5:
                    depth2_replier = random.choice(users)
                    depth2 = Comment.objects.create(
                        user=depth2_replier,
                        verse=parent.verse,
                        body=random.choice(COMMENT_BODIES_VERSE),
                        parent=reply,
                    )
                    all_comments.append(depth2)
                    # depth 3
                    if random.random() < 0.3:
                        depth3 = Comment.objects.create(
                            user=random.choice(users),
                            verse=parent.verse,
                            body=random.choice(COMMENT_BODIES_VERSE),
                            parent=depth2,
                        )
                        all_comments.append(depth3)

        # Q&Aコメント（5件）
        qa_verses = random.sample(verses[:20], min(5, len(verses)))
        for verse, question, answer in zip(qa_verses, QA_QUESTIONS, QA_ANSWERS):
            asker = random.choice(users)
            qa_comment = Comment.objects.create(
                user=asker,
                verse=verse,
                body=question,
                is_qa=True,
            )
            all_comments.append(qa_comment)
            answerer = random.choice([u for u in users if u != asker])
            best = Comment.objects.create(
                user=answerer,
                verse=verse,
                body=answer,
                parent=qa_comment,
            )
            all_comments.append(best)
            # ベストアンサー設定
            qa_comment.best_answer = best
            qa_comment.save(update_fields=["best_answer"])
            # 追加回答
            for _ in range(random.randint(1, 3)):
                extra_answerer = random.choice(users)
                extra = Comment.objects.create(
                    user=extra_answerer,
                    verse=verse,
                    body=random.choice(COMMENT_BODIES_VERSE),
                    parent=qa_comment,
                )
                all_comments.append(extra)

        # 論理削除コメント（3件）
        for comment in random.sample(all_comments[:30], min(3, len(all_comments))):
            comment.is_deleted = True
            comment.body = ""
            comment.save(update_fields=["is_deleted", "body"])

        # 通報（5件）
        reported = random.sample([c for c in all_comments if not c.is_deleted][:40], min(5, 40))
        for comment in reported:
            reporter = random.choice([u for u in users if u != comment.user])
            Report.objects.get_or_create(
                reporter=reporter,
                comment=comment,
                defaults={"reason": random.choice(REPORT_REASONS)},
            )

        self.stdout.write(f"  コメント {len(all_comments)} 件")
        return all_comments

    def _seed_votes(self, users, comments):
        if not comments:
            return
        count = 0
        active_comments = [c for c in comments if not c.is_deleted][:60]
        for comment in active_comments:
            num_votes = random.randint(0, min(8, len(users)))
            voters = random.sample(users, num_votes)
            for voter in voters:
                if voter != comment.user:
                    _, created = Vote.objects.get_or_create(user=voter, comment=comment)
                    if created:
                        count += 1
        self.stdout.write(f"  投票 {count} 件")

    def _seed_bookmarks(self, users, verses, comments):
        if not verses:
            return
        count = 0
        # 節ブックマーク
        for user in users:
            bookmarked_verses = random.sample(verses, min(5, len(verses)))
            for verse in bookmarked_verses:
                _, created = Bookmark.objects.get_or_create(user=user, verse=verse)
                if created:
                    count += 1
        # コメントブックマーク
        active_comments = [c for c in comments if not c.is_deleted][:40]
        for user in users:
            if active_comments:
                bookmarked_comments = random.sample(active_comments, min(3, len(active_comments)))
                for comment in bookmarked_comments:
                    if comment.user != user:
                        _, created = Bookmark.objects.get_or_create(user=user, comment=comment)
                        if created:
                            count += 1
        self.stdout.write(f"  ブックマーク {count} 件")

    def _seed_notifications(self, users, comments):
        if not comments:
            return
        count = 0
        active_comments = [c for c in comments if not c.is_deleted]

        # 返信通知
        reply_comments = [c for c in active_comments if c.parent is not None][:30]
        for reply in reply_comments:
            if reply.parent and reply.parent.user != reply.user:
                Notification.objects.get_or_create(
                    recipient=reply.parent.user,
                    actor=reply.user,
                    notification_type=Notification.REPLY,
                    comment=reply,
                    defaults={"is_read": random.choice([True, False])},
                )
                count += 1

        # upvote通知
        for comment in active_comments[:40]:
            votes = list(comment.votes.select_related("user").all()[:3])
            for vote in votes:
                if vote.user != comment.user:
                    Notification.objects.get_or_create(
                        recipient=comment.user,
                        actor=vote.user,
                        notification_type=Notification.UPVOTE,
                        comment=comment,
                        defaults={"is_read": random.choice([True, False, False])},
                    )
                    count += 1

        self.stdout.write(f"  通知 {count} 件")

    def _seed_reading_progress(self, users, books, chapters):
        if not books or not chapters:
            return
        count = 0
        chapters_by_book = {}
        for chapter in chapters:
            chapters_by_book.setdefault(chapter.book_id, []).append(chapter)

        for user in users:
            num_books = random.randint(2, min(6, len(books)))
            selected_books = random.sample(books, num_books)
            for book in selected_books:
                book_chapters = chapters_by_book.get(book.id, [])
                if not book_chapters:
                    continue
                chapter = random.choice(book_chapters)
                _, created = ReadingProgress.objects.get_or_create(
                    user=user,
                    book=book,
                    defaults={"chapter": chapter},
                )
                if created:
                    count += 1
        self.stdout.write(f"  読書進捗 {count} 件")

    def _seed_translations(self, users, books, verses):
        if not books:
            self.stdout.write("  翻訳プロジェクト: 聖書データなしのためスキップ")
            return

        book_map = {b.name: b for b in books}
        # スラッグ→書名のマッピング（import_gospel のデータに依存）
        slug_to_name = {
            "matthew": "マタイによる福音書",
            "john": "ヨハネによる福音書",
            "romans": "ローマの信徒への手紙",
        }

        created_projects = []
        for i, proj_data in enumerate(TRANSLATION_PROJECTS):
            book_name = slug_to_name.get(proj_data["book_slug"], "")
            book = book_map.get(book_name)
            if not book:
                # 代替として最初の書を使用
                book = books[min(i, len(books) - 1)]

            owner = users[i % len(users)]
            project, created = TranslationProject.objects.get_or_create(
                name=proj_data["name"],
                defaults={
                    "description": proj_data["description"],
                    "owner": owner,
                    "source_book": book,
                    "target_language": proj_data["target_language"],
                    "status": proj_data["status"],
                },
            )
            created_projects.append((project, owner, book))

            # オーナーメンバーシップ
            TranslationMembership.objects.get_or_create(
                project=project,
                user=owner,
                defaults={
                    "role": TranslationMembership.ROLE_OWNER,
                    "status": TranslationMembership.STATUS_APPROVED,
                },
            )

            # メンバー追加（approved 2〜4人、pending 1〜2人）
            other_users = [u for u in users if u != owner]
            approved_members = random.sample(other_users, min(3, len(other_users)))
            for member in approved_members:
                TranslationMembership.objects.get_or_create(
                    project=project,
                    user=member,
                    defaults={
                        "role": TranslationMembership.ROLE_MEMBER,
                        "status": TranslationMembership.STATUS_APPROVED,
                    },
                )

            pending_candidates = [u for u in other_users if u not in approved_members]
            pending_members = random.sample(pending_candidates, min(2, len(pending_candidates)))
            for member in pending_members:
                TranslationMembership.objects.get_or_create(
                    project=project,
                    user=member,
                    defaults={
                        "role": TranslationMembership.ROLE_MEMBER,
                        "status": TranslationMembership.STATUS_PENDING,
                    },
                )

            # rejected 1人
            rejected_candidates = [u for u in other_users if u not in approved_members and u not in pending_members]
            if rejected_candidates:
                rejected_member = random.choice(rejected_candidates)
                TranslationMembership.objects.get_or_create(
                    project=project,
                    user=rejected_member,
                    defaults={
                        "role": TranslationMembership.ROLE_MEMBER,
                        "status": TranslationMembership.STATUS_REJECTED,
                    },
                )

            # 翻訳ユニット（その書の節から最大20件）
            book_verses = [v for v in verses if v.chapter.book_id == book.id][:20]
            if not book_verses:
                book_verses = verses[:20]

            all_members = [owner] + approved_members
            unit_statuses = [
                TranslationUnit.STATUS_TODO,
                TranslationUnit.STATUS_TODO,
                TranslationUnit.STATUS_IN_PROGRESS,
                TranslationUnit.STATUS_REVIEW,
                TranslationUnit.STATUS_DONE,
            ]
            for j, verse in enumerate(book_verses):
                status = unit_statuses[j % len(unit_statuses)]
                assigned = random.choice(all_members) if status != TranslationUnit.STATUS_TODO else None
                body = TRANSLATION_UNIT_BODIES[j % len(TRANSLATION_UNIT_BODIES)] if status in [
                    TranslationUnit.STATUS_REVIEW, TranslationUnit.STATUS_DONE
                ] else ""
                TranslationUnit.objects.get_or_create(
                    project=project,
                    verse=verse,
                    defaults={
                        "assigned_to": assigned,
                        "body": body,
                        "status": status,
                    },
                )

            # 翻訳コメント（プロジェクト全体 + ユニット別）
            all_project_members = [owner] + approved_members
            for k in range(min(5, len(TRANSLATION_COMMENT_BODIES))):
                commenter = random.choice(all_project_members)
                TranslationComment.objects.create(
                    project=project,
                    user=commenter,
                    body=TRANSLATION_COMMENT_BODIES[k],
                )

            # ユニット別コメント
            units = list(project.units.all()[:5])
            for unit in units:
                if random.random() < 0.6:
                    commenter = random.choice(all_project_members)
                    body_idx = random.randint(0, len(TRANSLATION_COMMENT_BODIES) - 1)
                    TranslationComment.objects.create(
                        project=project,
                        unit=unit,
                        user=commenter,
                        body=TRANSLATION_COMMENT_BODIES[body_idx],
                    )

        self.stdout.write(f"  翻訳プロジェクト {len(created_projects)} 件")
