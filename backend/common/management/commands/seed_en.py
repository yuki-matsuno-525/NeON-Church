"""
English seed data for testing production-like scale.
python manage.py seed_en          # add seed data
python manage.py seed_en --clear  # wipe all non-staff data, then seed
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

# ── Seed data ─────────────────────────────────────────────────────────────────

USERS = [
    {"username": "rev_james_whitfield", "email": "james.whitfield@example.com", "bio": "Senior pastor at Grace Community Church. I use this platform to prepare sermons and share insights with my congregation."},
    {"username": "sarah_chen_theology", "email": "sarah.chen@example.com", "bio": "PhD candidate in New Testament studies at Princeton. Focused on Pauline theology and early Christian communities."},
    {"username": "mike_okonkwo", "email": "mike.okonkwo@example.com", "bio": "Born-again Christian from Lagos now living in London. Love comparing NIV and KJV translations to find deeper meaning."},
    {"username": "emily_hartwell", "email": "emily.hartwell@example.com", "bio": "Youth group leader and homeschool mom. I help kids engage with scripture through storytelling and discussion."},
    {"username": "dr_thomas_reed", "email": "thomas.reed@example.com", "bio": "Professor of biblical archaeology. Reading the Bible through the lens of ancient Near Eastern context."},
    {"username": "grace_adeyemi", "email": "grace.adeyemi@example.com", "bio": "Hospice chaplain. Scripture gives me words when words fail. Psalm 23 is my daily anchor."},
    {"username": "daniel_kowalski", "email": "daniel.kowalski@example.com", "bio": "Catholic convert from Poland, now in Chicago. Lectio Divina practitioner and Dominican lay associate."},
    {"username": "rachel_steinberg", "email": "rachel.steinberg@example.com", "bio": "Jewish-Christian interfaith dialogue facilitator. Interested in how the same texts read differently across traditions."},
    {"username": "pastor_elijah_brooks", "email": "elijah.brooks@example.com", "bio": "African Methodist Episcopal pastor. Preaching the liberating Gospel for 20 years in Baltimore."},
    {"username": "naomi_fletcher", "email": "naomi.fletcher@example.com", "bio": "Recovering atheist and new believer. Still asking hard questions, but this community helps me work through them."},
    {"username": "fr_patrick_malone", "email": "patrick.malone@example.com", "bio": "Catholic priest and Scripture scholar. Interested in the Deuterocanonical books and their role in Christian formation."},
    {"username": "david_martinez_jr", "email": "david.martinez@example.com", "bio": "Latino evangelical worship leader. I find lyric ideas in Psalms and the prophets every week."},
    {"username": "abigail_osei", "email": "abigail.osei@example.com", "bio": "Ghanaian nurse and Pentecostal believer. The book of Acts is my personal manual for living."},
    {"username": "caleb_thornton", "email": "caleb.thornton@example.com", "bio": "Seminary student at Dallas Theological. Studying systematic theology and how it ties to biblical narrative."},
    {"username": "priya_jacob", "email": "priya.jacob@example.com", "bio": "Indian Syrian Orthodox Christian. Love the rich liturgical tradition and its deep biblical roots."},
    {"username": "tim_oshaughnessy", "email": "tim.oshaughnessy@example.com", "bio": "Software engineer and lay preacher. I code by day and study Revelation by night."},
    {"username": "deborah_nguyen", "email": "deborah.nguyen@example.com", "bio": "Vietnamese-American Christian. Reading through the entire Bible in 2024 for the first time. Sharing my reflections here."},
    {"username": "nathaniel_ashford", "email": "nathaniel.ashford@example.com", "bio": "Anglican lay reader in rural England. I walk the hills and meditate on the Psalms."},
    {"username": "lydia_kamau", "email": "lydia.kamau@example.com", "bio": "Kenyan Bible translator working with Wycliffe. Passionate about getting scripture to every language group."},
    {"username": "ben_goldfarb", "email": "ben.goldfarb@example.com", "bio": "Messianic Jewish teacher. I focus on the Hebrew roots of New Testament language and imagery."},
    {"username": "clara_dupont", "email": "clara.dupont@example.com", "bio": "French Reformed Christian. I read Calvin's commentaries alongside the text and share notes here."},
    {"username": "jerome_walker_iii", "email": "jerome.walker@example.com", "bio": "Retired school teacher. I started reading the Bible at 65 and now I can't stop. Grateful for this community."},
    {"username": "amara_diallo", "email": "amara.diallo@example.com", "bio": "Muslim-background believer from Senegal. Exploring the Gospels with fresh eyes and open questions."},
    {"username": "ruth_mcallister", "email": "ruth.mcallister@example.com", "bio": "Biblical counselor and women's Bible study leader. The Psalms are my map through emotional valleys."},
    {"username": "jonathan_park_seoul", "email": "jonathan.park@example.com", "bio": "Korean American pastor's kid, now a church planter in Seattle. Trying to read Revelation without fear."},
    {"username": "esther_obi", "email": "esther.obi@example.com", "bio": "Nigerian theologian and author of 'Women in the Early Church.' Working on a commentary on Proverbs 31."},
    {"username": "felix_brunner", "email": "felix.brunner@example.com", "bio": "Swiss Reformed pastor with interest in the Apocrypha and Pseudepigrapha. Non-canonical texts deserve serious attention."},
    {"username": "hana_lindqvist", "email": "hana.lindqvist@example.com", "bio": "Swedish Lutheran and contemplative prayer practitioner. I sit with one verse per day."},
    {"username": "isaiah_oduya", "email": "isaiah.oduya@example.com", "bio": "Pentecostal evangelist based in Lagos. The book of Isaiah has never felt more relevant than today."},
    {"username": "margaret_sullivan", "email": "margaret.sullivan@example.com", "bio": "Retired nun and spiritual director. 50 years of lectio divina. Still learning. Still surprised."},
]

COMMENT_BODIES_VERSE = [
    "This verse has carried me through every major crisis in my life. I return to it like water in a desert.",
    "The Greek word here — 'agape' — isn't just love. It's the posture of laying down your own needs for another. Totally countercultural.",
    "When you situate this verse within its first-century Jewish context, the radical nature of Jesus's teaching becomes even sharper.",
    "I've memorized this one and it plays in my head on hard mornings. There's a kind of anchor in short, dense scripture.",
    "The Septuagint renders this phrase differently than the MT. The tension between them opens up a whole theological question.",
    "My pastor preached on this last Sunday and I had to come back and dig deeper. Three cross-references later, I'm more amazed.",
    "As a nurse, I read 'I will be with you' as a clinical promise. Presence matters more than answers at the bedside.",
    "Paul wrote this from prison. That changes everything about how I receive the command to rejoice.",
    "The Hebrew root 'shalom' is so much richer than our English 'peace' — wholeness, completeness, nothing missing.",
    "I've been sitting with this verse for a week and every time I read it I notice something I missed before.",
    "The metaphor of light here ties into the prologue of John in a way that's clearly intentional. The whole Gospel is lit by this image.",
    "I used this passage in a funeral homily last month. Grief and hope held together — that's what the text does.",
    "Worth noting: the 'you' in the original is plural. Jesus is addressing a community, not just individuals.",
    "Children grasp this verse intuitively. Adults tend to overcomplicate it. Maybe that's the point.",
    "The variant readings in the manuscript tradition here are significant. UBS5 prefers a slightly different text.",
    "I teach ethics at university and this verse continues to be the most disruptive thing I can put on a syllabus.",
    "The imperatives in this passage are present tense in Greek — ongoing, habitual action, not a one-time command.",
    "I spent six months in a monastery with this verse as my lectio. It changed the architecture of my prayer.",
    "The chiastic structure in this section is brilliant. Center it and everything else falls into place.",
    "This is quoted in the Dead Sea Scrolls commentary on Isaiah (4QpIsa). The interpretive tradition runs deep.",
    "As someone who came to faith late in life, I find this verse gives me tremendous hope. It's never too late.",
    "The parallel structure with the previous verse is intentional. The author is building toward a crescendo.",
    "I've heard this misquoted so many times. Context makes clear that the 'strength' here is explicitly God's, not our own.",
    "This is the verse I give to people after a diagnosis. It doesn't minimize pain — it faces it head-on.",
    "Worth comparing Luke's version here with Matthew's. The differences are theologically telling.",
    "The image of a shepherd was a royal metaphor in the ancient Near East. The political overtones are unmissable.",
    "I never noticed the verb tense shift until someone pointed it out in a study group. Now I can't unsee it.",
    "There's a rabbinic midrash on this verse that illuminates the Jewish background in a way most Christian commentaries miss.",
    "The interplay between divine sovereignty and human responsibility in this verse is the whole tension of Christian ethics.",
    "I read this verse at my grandmother's deathbed. She smiled and said 'yes.' I've never doubted it since.",
    "The word translated 'grace' here (charis) has an economic dimension in Greco-Roman culture — a gift that creates obligation.",
    "This is one of those verses that sounds simple but the deeper you go, the more it opens up.",
    "Calvin's commentary on this passage is characteristically precise. Luther's is more volcanic. Both are worth reading.",
    "The textual history of this verse is fascinating — three major variant traditions in the early manuscripts.",
    "I've been writing a song based on this verse. The rhythm of the language itself suggests a kind of music.",
    "The pattern of promise and command in this section is typical of covenantal literature. Both matter equally.",
]

COMMENT_BODIES_CHAPTER = [
    "The rhetorical architecture of this chapter is stunning. The argument builds in three waves, each more intense than the last.",
    "Our Bible study spent four sessions on this chapter alone. We haven't exhausted it yet.",
    "Luther called this chapter 'the most important document in the New Testament.' It's hard to disagree.",
    "The chapter break here is unfortunate — chapters 3 and 4 need to be read as one continuous argument.",
    "I've read this chapter in eight translations. Each one reveals something the others obscure.",
    "The Old Testament allusions packed into this chapter are extraordinary. Almost every sentence echoes something earlier.",
    "This chapter changed my theology when I was 22. I've reread it every year since.",
]

COMMENT_BODIES_BOOK = [
    "The Gospel of Mark's urgency — everything happens 'immediately' — is itself a theological statement about the kingdom breaking in.",
    "Job is the most honest book in the canon. It refuses easy answers and I love it for that.",
    "Revelation is not prediction — it's pastoral poetry for people under empire. Reading it that way is life-changing.",
    "The Wisdom of Solomon deserves far more attention than it gets in Protestant circles.",
    "Ecclesiastes is the Bible's great gift to honest skeptics. It belongs in every theology curriculum.",
]

QA_TITLES = [
    "Eye of a Needle: Literal or the Jerusalem Gate?",
    "Reconciling Paul on Women's Role in the Church",
    "Best Commentaries Without Original Languages",
    "Book of Enoch and Its New Testament Connections",
    "Engaging with the Imprecatory Psalms Today",
    "Literacy in First-Century Palestine and the Gospels",
    "Textual Traditions Behind the Ending of Mark",
]

QA_QUESTIONS = [
    "Does 'eye of a needle' (Matthew 19:24) refer to a literal needle or a gate in Jerusalem? What do the scholars say?",
    "How do we reconcile Paul's 'women should be silent' passages with his acknowledgment of female prophets and leaders elsewhere?",
    "What's the best commentary series for someone who knows no Greek or Hebrew but wants serious engagement with the text?",
    "Is the book of Enoch relevant for understanding the New Testament? How much did the early church know about it?",
    "How should modern Christians engage with the imprecatory Psalms — the ones that call down violence on enemies?",
    "What evidence do we have for the literacy rates in first-century Palestine, and how does that affect how we read the Gospels?",
    "Can someone walk me through the different textual traditions behind the ending of Mark's Gospel?",
]

QA_ANSWERS = [
    "Most scholars today lean toward the literal needle interpretation — the 'gate in Jerusalem' story is not attested before the 11th century and is likely a medieval harmonization. The point of the hyperbole is precisely that it's impossible without God.",
    "The tension is real and has generated enormous scholarly debate. Many interpreters distinguish between 1 Corinthians 14 (which may address a specific disorder) and 1 Timothy 2 (which may be pseudonymous), while Galatians 3:28 and Romans 16 show Paul's actual practice of affirming women leaders.",
    "For non-specialist serious readers, the NIV Application Commentary series offers solid scholarship in accessible language. For something more technical without requiring Greek, the New International Commentary on the New Testament (NICNT) series is outstanding.",
    "The book of 1 Enoch is quoted directly in Jude (vv. 14-15) and shows up allusively in Revelation, 1 Peter, and possibly Paul. Scholars like G.W.E. Nickelsburg have shown its wide influence. It was Scripture for some early communities.",
    "Three main approaches: (1) Pray them as honest laments, acknowledging the human impulse toward justice; (2) Read them as prayers against evil powers, not persons; (3) Understand them christologically, as Christ's cry on the cross. All three have serious defenders.",
    "William Harris's 'Ancient Literacy' (1989) argues literacy rates were around 10-15% in the Roman Empire and lower in rural Palestine. This has enormous implications — Jesus and his disciples would have been exceptional for their milieu. Some scholars (e.g., Chris Keith) argue Jesus was controversially positioned between literate and non-literate culture.",
    "Mark 16 ends at verse 8 in the earliest manuscripts (Codex Sinaiticus, Codex Vaticanus). Verses 9-20 (the 'Longer Ending') appear later and are considered a second-century addition by most text critics. There's also a 'Shorter Ending' found in a few manuscripts. Most modern translations note all of this.",
]

REPORT_REASONS = ["spam", "offensive", "misinformation", "other"]

TRANSLATION_PROJECTS = [
    {
        "name": "Contemporary English Gospels",
        "description": "A fresh translation of the four Gospels into natural, idiomatic modern English. Avoiding both archaism and dumbing-down, the goal is language that sounds like educated conversation.",
        "target_language": "en",
        "status": "published",
        "book_slug": "matthew",
    },
    {
        "name": "Plain Language New Testament",
        "description": "Designed for new readers, people with limited literacy, and those for whom English is a second language. Every verse aims for clarity without sacrificing accuracy.",
        "target_language": "en",
        "status": "active",
        "book_slug": "john",
    },
    {
        "name": "Scholarly Study Edition — Romans",
        "description": "A translation of Romans intended for academic use, with close attention to Greek grammar, textual variants, and the history of interpretation.",
        "target_language": "en",
        "status": "draft",
        "book_slug": "romans",
    },
    {
        "name": "Inclusive Language Psalter",
        "description": "A new translation of the Psalms using gender-inclusive language where the Hebrew is genuinely inclusive, while maintaining poetic force and liturgical usability.",
        "target_language": "en",
        "status": "active",
        "book_slug": "psalms",
    },
]

TRANSLATION_UNIT_BODIES = [
    "For God loved the world in this way: he gave his one and only Son, so that everyone who trusts in him will not be lost but will have eternal life.",
    "In the beginning was the Word, and the Word was with God, and the Word was God.",
    "I am the way, the truth, and the life. No one comes to the Father except through me.",
    "You are the light of the world. A city built on a hill cannot be hidden.",
    "Blessed are the poor in spirit, for the kingdom of heaven belongs to them.",
    "Blessed are those who mourn, for they will be comforted.",
    "Blessed are the gentle, for they will inherit the earth.",
    "Blessed are those who hunger and thirst for righteousness, for they will be satisfied.",
    "Blessed are the merciful, for they will receive mercy.",
    "Blessed are the pure in heart, for they will see God.",
    "Blessed are the peacemakers, for they will be called children of God.",
    "Blessed are those who are persecuted for righteousness, for the kingdom of heaven belongs to them.",
    "Love is patient, love is kind. It does not envy, it does not boast, it is not arrogant.",
    "The Lord is my shepherd; I have everything I need.",
    "Your word is a lamp for my feet and a light for my path.",
    "Come to me, all of you who are weary and burdened, and I will give you rest.",
    "I have been crucified with Christ and I no longer live, but Christ lives in me.",
    "Do not be anxious about anything, but in every situation, with prayer and petition, present your requests to God.",
    "I can do all things through him who gives me strength.",
    "The grace of the Lord Jesus Christ, the love of God, and the fellowship of the Holy Spirit be with you all.",
]

TRANSLATION_COMMENT_BODIES = [
    "The word 'loved' here is the aorist of agapao — a completed action in history, not an ongoing feeling. Our translation should reflect that decisiveness.",
    "I prefer 'Word' over 'Logos' in the translation, but we should note the philosophical weight in a footnote for study editions.",
    "The Greek construction for 'I am the way' echoes the divine 'I AM' declarations in Exodus. That allusion should be preserved somehow.",
    "'Light of the world' — should we capitalize 'world' (kosmos) to signal its theological meaning beyond the physical universe?",
    "The Beatitudes use 'blessed' (makarios) which also carries the sense of 'fortunate' or 'to be congratulated.' Neither English word fully captures it.",
    "'Gentle' vs 'meek' vs 'humble' — the Greek praus describes a controlled strength, not weakness. 'Gentle' is closer but still not quite right.",
    "The 'kingdom of heaven' vs 'kingdom of God' distinction (Matthew uses 'heaven' as a Jewish circumlocution) is worth a footnote.",
    "'Patient' for makrothymeo — literally 'long-tempered.' The compound word itself contains the meaning. Hard to replicate in English.",
    "'Pure in heart' — the Greek refers to undivided allegiance, not moral perfection. This is a significant interpretive point for our translation note.",
    "The word translated 'persecuted' is a perfect passive participle, suggesting an ongoing condition, not a single event. 'Those who face ongoing persecution' might be clearer.",
    "In the shepherd Psalm, the Hebrew 'I shall not want' is more literally 'there is nothing I lack' — present reality, not future hope.",
    "'Footnote needed': the 'lamp for my feet' was a small oil lamp held close to the ground — light for just the next step, not the whole journey.",
    "'Rest' in the Matthew 11 invitation is anapausis — the cessation of burden, not sleep. Might be worth capturing with 'relief' or 'ease.'",
    "Galatians 2:20: 'no longer I who live' — the grammar here is deliberately paradoxical. Any translation should preserve that tension.",
    "The 'peace' in Philippians 4 is not absence of trouble but the shalom quality of completeness. 'Tranquility' might better than 'peace' here.",
]


class Command(BaseCommand):
    help = "Seed production-scale English test data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all non-staff user data before seeding",
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

        self.stdout.write(self.style.SUCCESS("English seed data loaded successfully"))

    def _clear_data(self):
        self.stdout.write("Clearing existing data...")
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
        self.stdout.write("Done clearing")

    def _seed_tags(self):
        from comments.models import PREDEFINED_TAGS
        for name, _ in PREDEFINED_TAGS:
            Tag.objects.get_or_create(name=name)
        self.stdout.write(f"  Tags: {len(PREDEFINED_TAGS)}")

    def _seed_users(self):
        users = []
        created = 0
        for data in USERS:
            user, is_new = User.objects.get_or_create(
                username=data["username"],
                defaults={"email": data["email"], "bio": data["bio"]},
            )
            if is_new:
                user.set_password("Seed@pass123")
                user.save(update_fields=["password"])
                created += 1
            users.append(user)
        self.stdout.write(f"  Users: {created} created ({len(users)} total)")
        return users

    def _get_bible_data(self):
        # Grab more books/chapters/verses than the Japanese seed for higher volume
        books = list(Book.objects.prefetch_related("chapters__verses").order_by("order")[:20])
        if not books:
            self.stderr.write("  WARNING: No Bible data. Run import_gospel first.")
            return [], [], []
        chapters = []
        verses = []
        for book in books:
            for chapter in book.chapters.all()[:8]:
                chapters.append(chapter)
                for verse in chapter.verses.all()[:15]:
                    verses.append(verse)
        self.stdout.write(f"  Bible data: {len(books)} books, {len(chapters)} chapters, {len(verses)} verses")
        return books, chapters, verses

    def _seed_comments(self, users, books, chapters, verses):
        if not verses:
            self.stdout.write("  Comments: skipped (no Bible data)")
            return []

        tags = list(Tag.objects.all())
        all_comments = []

        # Verse comments — 3-6 per verse, over up to 80 verses
        for verse in verses[:80]:
            num_comments = random.randint(3, 6)
            for _ in range(num_comments):
                user = random.choice(users)
                comment = Comment.objects.create(
                    user=user,
                    verse=verse,
                    body=random.choice(COMMENT_BODIES_VERSE),
                    is_qa=False,
                )
                if tags and random.random() < 0.65:
                    comment.tags.set(random.sample(tags, k=random.randint(1, 2)))
                all_comments.append(comment)

        # Chapter comments
        for chapter in chapters[:20]:
            for _ in range(random.randint(2, 4)):
                comment = Comment.objects.create(
                    user=random.choice(users),
                    chapter=chapter,
                    body=random.choice(COMMENT_BODIES_CHAPTER),
                )
                if tags and random.random() < 0.5:
                    comment.tags.set(random.sample(tags, 1))
                all_comments.append(comment)

        # Book comments
        for book in books[:8]:
            comment = Comment.objects.create(
                user=random.choice(users),
                book=book,
                body=random.choice(COMMENT_BODIES_BOOK),
            )
            all_comments.append(comment)

        # Reply trees — up to depth 4
        top_level = [c for c in all_comments if c.verse is not None][:50]
        for parent in top_level:
            for _ in range(random.randint(2, 6)):
                replier = random.choice(users)
                reply = Comment.objects.create(
                    user=replier,
                    verse=parent.verse,
                    body=random.choice(COMMENT_BODIES_VERSE),
                    parent=parent,
                )
                all_comments.append(reply)
                if random.random() < 0.6:
                    depth2 = Comment.objects.create(
                        user=random.choice(users),
                        verse=parent.verse,
                        body=random.choice(COMMENT_BODIES_VERSE),
                        parent=reply,
                    )
                    all_comments.append(depth2)
                    if random.random() < 0.4:
                        depth3 = Comment.objects.create(
                            user=random.choice(users),
                            verse=parent.verse,
                            body=random.choice(COMMENT_BODIES_VERSE),
                            parent=depth2,
                        )
                        all_comments.append(depth3)
                        if random.random() < 0.2:
                            depth4 = Comment.objects.create(
                                user=random.choice(users),
                                verse=parent.verse,
                                body=random.choice(COMMENT_BODIES_VERSE),
                                parent=depth3,
                            )
                            all_comments.append(depth4)

        # Q&A threads
        qa_verses = random.sample(verses[:40], min(7, len(verses)))
        for verse, title, question, answer in zip(qa_verses, QA_TITLES, QA_QUESTIONS, QA_ANSWERS):
            asker = random.choice(users)
            qa = Comment.objects.create(
                user=asker,
                verse=verse,
                title=title,
                body=question,
                is_qa=True,
            )
            all_comments.append(qa)
            answerer = random.choice([u for u in users if u != asker])
            best = Comment.objects.create(
                user=answerer,
                verse=verse,
                body=answer,
                parent=qa,
            )
            all_comments.append(best)
            qa.best_answer = best
            qa.save(update_fields=["best_answer"])
            for _ in range(random.randint(2, 5)):
                extra = Comment.objects.create(
                    user=random.choice(users),
                    verse=verse,
                    body=random.choice(COMMENT_BODIES_VERSE),
                    parent=qa,
                )
                all_comments.append(extra)

        # Soft-delete a small fraction
        deletable = [c for c in all_comments if c.parent is None]
        for comment in random.sample(deletable, min(8, len(deletable))):
            comment.is_deleted = True
            comment.body = ""
            comment.save(update_fields=["is_deleted", "body"])

        # Reports
        reportable = [c for c in all_comments if not c.is_deleted][:60]
        for comment in random.sample(reportable, min(10, len(reportable))):
            reporter = random.choice([u for u in users if u != comment.user])
            Report.objects.get_or_create(
                reporter=reporter,
                comment=comment,
                defaults={"reason": random.choice(REPORT_REASONS)},
            )

        self.stdout.write(f"  Comments: {len(all_comments)}")
        return all_comments

    def _seed_votes(self, users, comments):
        if not comments:
            return
        count = 0
        active = [c for c in comments if not c.is_deleted][:150]
        for comment in active:
            num_votes = random.randint(0, min(15, len(users)))
            for voter in random.sample(users, num_votes):
                if voter != comment.user:
                    _, created = Vote.objects.get_or_create(user=voter, comment=comment)
                    if created:
                        count += 1
        self.stdout.write(f"  Votes: {count}")

    def _seed_bookmarks(self, users, verses, comments):
        if not verses:
            return
        count = 0
        for user in users:
            for verse in random.sample(verses, min(10, len(verses))):
                _, created = Bookmark.objects.get_or_create(user=user, verse=verse)
                if created:
                    count += 1
        active_comments = [c for c in comments if not c.is_deleted][:80]
        for user in users:
            if active_comments:
                for comment in random.sample(active_comments, min(5, len(active_comments))):
                    if comment.user != user:
                        _, created = Bookmark.objects.get_or_create(user=user, comment=comment)
                        if created:
                            count += 1
        self.stdout.write(f"  Bookmarks: {count}")

    def _seed_notifications(self, users, comments):
        if not comments:
            return
        count = 0
        active = [c for c in comments if not c.is_deleted]

        for reply in [c for c in active if c.parent is not None][:60]:
            if reply.parent and reply.parent.user != reply.user:
                Notification.objects.get_or_create(
                    recipient=reply.parent.user,
                    actor=reply.user,
                    notification_type=Notification.REPLY,
                    comment=reply,
                    defaults={"is_read": random.choice([True, False])},
                )
                count += 1

        for comment in active[:80]:
            for vote in list(comment.votes.select_related("user").all()[:5]):
                if vote.user != comment.user:
                    Notification.objects.get_or_create(
                        recipient=comment.user,
                        actor=vote.user,
                        notification_type=Notification.UPVOTE,
                        comment=comment,
                        defaults={"is_read": random.choice([True, False, False])},
                    )
                    count += 1

        self.stdout.write(f"  Notifications: {count}")

    def _seed_reading_progress(self, users, books, chapters):
        if not books or not chapters:
            return
        count = 0
        chapters_by_book = {}
        for chapter in chapters:
            chapters_by_book.setdefault(chapter.book_id, []).append(chapter)

        for user in users:
            for book in random.sample(books, random.randint(3, min(8, len(books)))):
                book_chapters = chapters_by_book.get(book.id, [])
                if not book_chapters:
                    continue
                _, created = ReadingProgress.objects.get_or_create(
                    user=user,
                    book=book,
                    defaults={"chapter": random.choice(book_chapters)},
                )
                if created:
                    count += 1
        self.stdout.write(f"  Reading progress: {count}")

    def _seed_translations(self, users, books, verses):
        if not books:
            self.stdout.write("  Translation projects: skipped (no Bible data)")
            return

        book_map = {b.name: b for b in books}
        slug_to_name = {
            "matthew": "マタイによる福音書",
            "john": "ヨハネによる福音書",
            "romans": "ローマの信徒への手紙",
            "psalms": "詩編",
        }

        created_projects = []
        for i, proj_data in enumerate(TRANSLATION_PROJECTS):
            book_name = slug_to_name.get(proj_data["book_slug"], "")
            book = book_map.get(book_name) or books[min(i, len(books) - 1)]

            owner = users[i % len(users)]
            project, _ = TranslationProject.objects.get_or_create(
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

            TranslationMembership.objects.get_or_create(
                project=project,
                user=owner,
                defaults={
                    "role": TranslationMembership.ROLE_OWNER,
                    "status": TranslationMembership.STATUS_APPROVED,
                },
            )

            other_users = [u for u in users if u != owner]
            approved_members = random.sample(other_users, min(5, len(other_users)))
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
            for member in random.sample(pending_candidates, min(3, len(pending_candidates))):
                TranslationMembership.objects.get_or_create(
                    project=project,
                    user=member,
                    defaults={
                        "role": TranslationMembership.ROLE_MEMBER,
                        "status": TranslationMembership.STATUS_PENDING,
                    },
                )

            rejected_candidates = [u for u in pending_candidates if u not in approved_members]
            if rejected_candidates:
                TranslationMembership.objects.get_or_create(
                    project=project,
                    user=random.choice(rejected_candidates),
                    defaults={
                        "role": TranslationMembership.ROLE_MEMBER,
                        "status": TranslationMembership.STATUS_REJECTED,
                    },
                )

            book_verses = [v for v in verses if v.chapter.book_id == book.id][:25]
            if not book_verses:
                book_verses = verses[:25]

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
                    defaults={"assigned_to": assigned, "body": body, "status": status},
                )

            for k in range(min(8, len(TRANSLATION_COMMENT_BODIES))):
                TranslationComment.objects.create(
                    project=project,
                    user=random.choice(all_members),
                    body=TRANSLATION_COMMENT_BODIES[k],
                )

            for unit in list(project.units.all()[:8]):
                if random.random() < 0.7:
                    TranslationComment.objects.create(
                        project=project,
                        unit=unit,
                        user=random.choice(all_members),
                        body=TRANSLATION_COMMENT_BODIES[random.randint(0, len(TRANSLATION_COMMENT_BODIES) - 1)],
                    )

        self.stdout.write(f"  Translation projects: {len(created_projects)}")
