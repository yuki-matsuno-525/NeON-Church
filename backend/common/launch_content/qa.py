"""
Q&A。初めて来た人がよく抱く疑問を、編集部が質問として立て、案内係が答える。

- "best": True の回答があると「解決済み」になる。事実で答えられる質問だけをそうする。
- 立場によって答えが分かれる質問は、回答を置いても解決済みにしない（他の人の回答を待つ）。
- 回答の無い質問も少し残す。利用者が最初に答えられる場所になるように。
"""

QUESTIONS = [
    # ── サイトの使い方・本の種類 ────────────────────────────────────────────
    {
        "ref": "enoch",
        "author": "editors",
        "tags": ["解説"],
        "title": "Why does this site include books that aren't in my Bible?",
        "body": """
I opened the book list and found Enoch, the Gospel of Thomas, Tobit, the Gospel of Mary... My Bible has 66 books. Are these being presented as Scripture?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
Short answer: no single list of books is "the Bible" for every Christian, and we would rather show you the texts than decide for you.

- Protestant Bibles usually have 66 books.
- Catholic Bibles add seven more books (Tobit, Judith, Wisdom, Sirach, Baruch, 1 and 2 Maccabees) plus longer forms of Esther and Daniel.
- Orthodox Bibles include those and a few more (such as 1 Esdras, 3 Maccabees, and the Prayer of Manasseh).
- The Ethiopian Orthodox Tewahedo Church also includes 1 Enoch and Jubilees.

Then there are early Christian writings that no church put in its Bible — the Gospel of Thomas, the Gospel of Mary, the Gospel of Peter — but which tell us how early Christians thought, argued, and prayed.

We put all of these on the same shelf and let you read each one in its own words. Each book's introduction says where it comes from and who reads it as Scripture. Whether a book is Scripture for you is your call, not ours.
""",
            },
        ],
    },
    {
        "ref": "tobit",
        "author": "editors",
        "tags": ["解説"],
        "title": "What's the difference between 'deuterocanonical' and 'apocrypha'?",
        "body": """
I've seen Tobit called both. Are they the same thing?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
They often refer to the same books, seen from different sides.

"Deuterocanonical" ("second canon") is the Catholic and Orthodox term for books like Tobit, Judith, Wisdom, Sirach, Baruch and 1–2 Maccabees. It means they are Scripture, recognized later or with more debate than the others — not that they are second-rate.

"Apocrypha" is the usual Protestant term for the same group of books. Protestant reformers did not count them as Scripture, though they often kept them in a separate section of the Bible for reading. The 1611 King James Bible printed them between the Old and New Testaments.

To add to the confusion, "apocrypha" is also used more loosely for writings no church accepted, like the Gospel of Thomas, and "pseudepigrapha" for works written under the name of an ancient figure, like Enoch. On this site we avoid ranking labels and describe each book by where it comes from and who reads it.
""",
            },
        ],
    },
    {
        "ref": "john 1",
        "author": "editors",
        "tags": ["解説"],
        "title": "Which translation should I start with?",
        "body": """
The translation switcher shows KJV, 口語訳, 文語訳, Greek, Hebrew... I read English. Where should I begin?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
For English readers: start with the KJV. It is the only complete English Bible on the site right now, and its language, though old, is the source of countless English phrases. The books outside the KJV have their own English translations (R. H. Charles for Enoch, Mark M. Mattison for the early gospels, L. C. L. Brenton for the Greek Old Testament books).

Then use the other editions as a lens, not a replacement:

- Open Nestle 1904 (GRC) or TR (GRC) next to the KJV in the Gospels. Even if you cannot read Greek, you can see where a verse is missing or bracketed (try Matthew 6:13 or Mark 16:9).
- In the Old Testament, the Hebrew (WLC) and the Greek (LXX) show you the two ancient forms of the text that translations draw on.

Japanese readers can start with 口語訳 (1955), and try 文語訳 for the older literary style.
""",
            },
        ],
    },
    {
        "ref": "genesis 1:1",
        "author": "editors",
        "tags": ["解説"],
        "title": "How do I use the Hebrew and Greek texts if I don't know the languages?",
        "body": """
Is there any point opening the WLC or LXX if I can't read them?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
More than you'd expect. A few things you can do without knowing a word:

1. Compare length. If the Greek of a verse is much shorter than the KJV, something is missing or added. The ends of the Lord's Prayer (Matthew 6:13) and of Mark (16:9–20) are classic cases.
2. Watch repetition. In Genesis 1 the same Hebrew phrases repeat at the same points in each day. You can see the pattern before you can read it.
3. Count verses. Some books are numbered differently in the Hebrew and Greek traditions (the Psalms are a famous example), and seeing both helps explain why references sometimes don't match.
4. Notice direction. Hebrew runs right to left; that alone reminds you that every English verse is a translation.

And if you want to learn, the Q&A here is a good place to ask what a particular word is.
""",
            },
        ],
    },
    {
        "ref": "john",
        "author": "editors",
        "tags": ["解説"],
        "title": "Is it okay to read these texts here if I'm not religious?",
        "body": """
I'm curious about the Bible as literature and history, not as a believer. Am I welcome to read and comment?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
Yes. The site is built for readers with and without faith, and the editors' posts deliberately set traditional, skeptical, literary, and ethical readings side by side.

What we ask of everyone is in the community guidelines: argue with readings, not with people. A believer explaining why a verse matters to them and a historian explaining why they doubt its date are both doing what this site is for.
""",
            },
        ],
    },
    {
        "ref": "quelle",
        "author": "editors",
        "tags": ["解説"],
        "title": "What is Q? Why is it in the book list if no manuscript exists?",
        "body": """
The Gospel of Q is listed next to real manuscripts. How can you read a book that doesn't survive?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
Q (from German "Quelle," source) is a hypothesis. Matthew and Luke share a lot of material that is not in Mark — mostly sayings of Jesus, such as the Lord's Prayer and the Beatitudes — often in very similar wording. Many scholars explain this by proposing that both used Mark plus a second, now-lost source of sayings. That second source is called Q.

What you read here is a scholarly reconstruction made from the shared passages, in Mark M. Mattison's translation. Chapter and verse numbers follow Luke, because Luke is usually thought to keep Q's order better.

Not every scholar accepts Q; some think Luke simply used Matthew. Reading the reconstruction next to Matthew and Luke is a good way to judge for yourself.
""",
            },
        ],
    },
    {
        "ref": "mary 1",
        "author": "editors",
        "tags": ["解説"],
        "title": "Why does the Gospel of Mary start at verse 7?",
        "body": """
Chapter 1 begins at 7, and there are gaps later. Is the text broken?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
The manuscript is. The Gospel of Mary survives mainly in one Coptic book, and its first six pages and pages 11 to 14 are lost. On this site the verse numbers are the manuscript's page numbers, so the numbering itself shows you where pages are missing.

That's why the text opens in the middle of a conversation, with the disciples asking the Savior whether matter will be destroyed.
""",
            },
        ],
    },
    {
        "ref": "infancy-thomas",
        "author": "editors",
        "tags": ["解説"],
        "title": "Is the Infancy Gospel of Thomas the same as the Gospel of Thomas?",
        "body": """
Both have Thomas in the name. Same author? Same book?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
No — they are two unrelated works.

The Gospel of Thomas is a collection of 114 sayings of Jesus, with almost no story, attributed to "Didymos Judas Thomas."

The Infancy Gospel of Thomas is a set of stories about Jesus as a child: making clay sparrows that fly away, and some startling episodes where the child Jesus harms people who cross him. It opens in the voice of "Thomas the Israelite."

They share a name and nothing else. Read the first chapter of each and you'll see the difference immediately.
""",
            },
        ],
    },
    {
        "ref": "susanna",
        "author": "editors",
        "tags": ["解説"],
        "title": "Why do some Bibles have extra chapters in Daniel and Esther?",
        "body": """
I found Susanna and Bel and the Dragon listed separately. My friend says they're "part of Daniel" in her Bible.
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
Your friend is right, and so is the book list.

The Greek versions of Daniel and Esther are longer than the Hebrew ones. Greek Daniel includes the Prayer of Azariah and the Song of the Three Young Men (inside chapter 3), and the stories of Susanna and of Bel and the Dragon. Greek Esther has about a hundred extra verses, including prayers — notably, the Hebrew Esther never mentions God.

Catholic and Orthodox Bibles include these additions as part of Daniel and Esther. Protestant Bibles that print them at all put them in the Apocrypha as separate pieces. On this site Susanna and Bel and the Dragon are separate books, in Brenton's translation of the Greek.
""",
            },
        ],
    },
    {
        "ref": "prayer-of-manasseh",
        "author": "editors",
        "tags": ["解説"],
        "title": "Who was Manasseh, and why does he have a prayer?",
        "body": """
This is only one chapter long. Where does it fit?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
Manasseh was a king of Judah, remembered in 2 Kings 21 as one of the worst. 2 Chronicles 33 adds that he was taken captive to Babylon, humbled himself, and prayed, and that God heard him (33:12–13); it says his prayer was written down (33:18–19), but does not give it.

The Prayer of Manasseh is a short penitential prayer that fills that gap. It appears in some Greek manuscripts among the biblical songs ("Odes"), and was printed in the Apocrypha of the 1611 KJV. It is a good place to read what repentance sounds like from someone who had a great deal to repent of.
""",
            },
        ],
    },
    # ── 本文についての質問 ──────────────────────────────────────────────────
    {
        "ref": "genesis 2:4",
        "author": "editors",
        "tags": ["考察"],
        "title": "Why are there two creation stories in Genesis 1 and 2?",
        "body": """
In chapter 1, humans are made last, male and female together. In chapter 2, the man is formed first, then plants, then animals, then the woman. Are these two different accounts?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
Many readers see two accounts with different styles: 1:1–2:3 and 2:4 onward. You can even see a difference in English: chapter 1 says "God," and from 2:4 the KJV says "the LORD God" — in Hebrew, a different name for God is added.

How to explain that is where readers part ways:

- Many scholars think Genesis brings together sources from different times, and the two creation stories come from different hands.
- Many traditional readers see one author giving first a wide view of all creation (chapter 1) and then a close view of the human beings (chapter 2), so the two are complementary rather than competing.

Either way, it is worth reading them as two pictures: one of an ordered cosmos made by a word, one of a garden, dust, breath, and loneliness.
""",
            },
        ],
    },
    {
        "ref": "genesis 6:4",
        "author": "editors",
        "tags": ["解説"],
        "title": "Who were the Nephilim?",
        "body": """
"There were giants in the earth in those days." Who were they, and are they related to the giants in Enoch?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
Genesis 6:4 is all the book says about them, and it is famously unclear. The word "Nephilim" appears here and again in Numbers 13:33, where Israel's spies say they saw Nephilim in Canaan and felt like grasshoppers beside them. The KJV and the Greek LXX both translate it as "giants."

1 Enoch 6–7 tells a full story: angels who descend and father "great giants" with human women, who then devour the earth. Many readers take Enoch as an expansion of Genesis 6; others read "sons of God" in Genesis as humans and keep the two apart.

If you want to compare, read Genesis 6:1–4 and Enoch 6–8 back to back — both are on the site.
""",
            },
        ],
    },
    {
        "ref": "isaiah 14:12",
        "author": "editors",
        "tags": ["解説"],
        "title": "Is 'Lucifer' in Isaiah 14:12 a name for Satan?",
        "body": """
The KJV says "How art thou fallen from heaven, O Lucifer, son of the morning!" Is this about the devil's fall?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
In its own context, Isaiah 14 is a taunt against the king of Babylon — verse 4 says so directly. The Hebrew calls him something like "shining one, son of the dawn," an image of the morning star. "Lucifer" ("light-bearer") is the Latin word for the morning star, which entered English through the Latin Vulgate.

Later Christian interpreters read the passage as also describing the fall of Satan, and the name "Lucifer" stuck to the devil from there. But the word itself is not a proper name in the Bible: the same Latin word is used for the "day star" of 2 Peter 1:19, and Revelation 22:16 calls Jesus "the bright and morning star."

So: a name for Satan in Christian tradition, not in Isaiah's text.
""",
            },
        ],
    },
    {
        "ref": "psalms 3:2",
        "author": "editors",
        "tags": ["解説"],
        "title": "What does 'Selah' mean?",
        "body": """
It appears at the end of verses all over the Psalms. Am I supposed to read it aloud?
""",
        "answers": [
            {
                "author": "guides",
                "best": True,
                "body": """
Honestly: nobody knows for sure. "Selah" appears about seventy times in the Psalms and three times in Habakkuk 3, always without explanation. It is probably a musical or liturgical marking — a pause, an instrumental interlude, or a cue to raise the voice. The Greek LXX translates it with a word that seems to mean an interlude.

Translations keep it as it is (KJV "Selah," 口語訳「セラ」) precisely because no one can translate it confidently. Most people don't read it aloud; treating it as a breath before the next line works well.
""",
            },
        ],
    },
    {
        "ref": "mark 6:3",
        "author": "editors",
        "tags": ["考察"],
        "title": "Did Jesus have brothers and sisters?",
        "body": """
Mark 6:3 names "James, and Joses, and of Juda, and Simon" and mentions sisters. But I've heard some churches say Mary had no other children.
""",
        "answers": [
            {
                "author": "guides",
                "body": """
This is a real disagreement between Christian traditions, and the text alone does not settle it. There are three classic readings:

1. They were children of Joseph and Mary, born after Jesus. This is the common Protestant reading and the most straightforward sense of the words.
2. They were Joseph's children from an earlier marriage. This is the traditional Orthodox view, and it has early support: in the Infancy Gospel of James (9:2), Joseph says, "I have sons and am an old man."
3. They were cousins or close relatives, since "brother" could be used broadly. This is the traditional Catholic view, associated with Jerome.

You can read the Infancy Gospel of James on this site and decide how much weight its story should carry.
""",
            },
        ],
    },
    {
        "ref": "matthew 1:16",
        "author": "editors",
        "tags": ["考察"],
        "title": "Why do Matthew's and Luke's genealogies of Jesus differ?",
        "body": """
Matthew says Joseph's father was Jacob; Luke 3:23 says Heli. Matthew goes through Solomon, Luke through Nathan. How do these fit together?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
They do differ, and people have noticed since antiquity. A few explanations that have been offered:

- Luke gives Mary's line and Matthew Joseph's (Luke 3:23 says Jesus was "as was supposed" the son of Joseph).
- One list gives legal descent and the other biological, connected by a levirate marriage (a man marrying his brother's widow). An early form of this explanation, by Julius Africanus, is quoted by Eusebius.
- The two lists are theological rather than archival: Matthew arranges his in three sets of fourteen (1:17) and starts with Abraham; Luke runs backward to Adam, "which was the son of God" (3:38).

These options are not all exclusive. If you have a view, add an answer.
""",
            },
        ],
    },
    {
        "ref": "acts 1:18",
        "author": "editors",
        "tags": ["考察"],
        "title": "How did Judas die — by hanging or by falling?",
        "body": """
Matthew 27:5 says Judas hanged himself. Acts 1:18 says he fell headlong and burst open. Which is it?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
The two accounts also disagree on who bought the field: in Matthew the priests buy it with the returned silver (27:6–8); in Acts, Judas "purchased a field" himself (1:18). Both explain the name "field of blood."

Some readers harmonize them: Judas hanged himself, and the body later fell. Others see two independent traditions about a death everyone agreed was terrible, each told for its own purpose. Matthew's version echoes a prophecy (27:9–10); Acts uses the death to explain why a twelfth apostle had to be chosen.

The question is open — say which reading persuades you, and why.
""",
            },
        ],
    },
    {
        "ref": "mark 3:29",
        "author": "editors",
        "tags": ["考察"],
        "title": "What is the 'unforgivable sin'?",
        "body": """
"He that shall blaspheme against the Holy Ghost hath never forgiveness." This frightens people. What does it mean?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
Mark explains the saying in the very next verse: "Because they said, He hath an unclean spirit" (3:30). Teachers had watched Jesus heal and concluded that his power came from Beelzebub (3:22).

So in context it is about calling God's work evil — looking at healing and calling it demonic. Many interpreters add a pastoral point: someone who is afraid they have committed this sin is showing exactly the concern for God that the people in Mark 3 lacked.

Traditions differ on how far to extend the saying beyond its setting. If you read it differently, add an answer.
""",
            },
        ],
    },
    {
        "ref": "revelation 13:18",
        "author": "editors",
        "tags": ["解説"],
        "title": "What is the number of the beast, 666?",
        "body": """
Is 666 code for someone?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
"Here is wisdom. Let him that hath understanding count the number of the beast." In Hebrew and Greek, letters doubled as numbers, so a name could be "counted." A widely held scholarly view is that 666 is the value of "Nero Caesar" written in Hebrew letters.

Interestingly, some ancient manuscripts read 616 instead, and Irenaeus, writing in the second century, knew of that reading. Spelled in its Latin form, "Nero Caesar" gives 616 — which many take as support for the Nero reading.

Other readers take the number symbolically (six falling short of seven, the number of completeness) or as a reference to powers that were still to come. Revelation does not say who it means, which is why it has been "decoded" so many times.
""",
            },
        ],
    },
    {
        "ref": "john 2:13",
        "author": "editors",
        "tags": ["考察"],
        "title": "Why is John so different from Matthew, Mark and Luke?",
        "body": """
In John, Jesus clears the temple at the start of his ministry, not the end. He goes to Jerusalem several times. There are long speeches and almost no parables. Why?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
You've noticed the main differences: John places the temple scene early (2:13–22), mentions several Passovers (2:13, 6:4, 11:55), and gives Jesus long discourses and "I am" sayings instead of short parables.

Explanations range widely:

- John knew the others and wrote to supplement them. This view goes back to the early church, which called John the "spiritual" gospel.
- John drew on an independent tradition, which in places (like the multiple trips to Jerusalem) may be historically better informed.
- John arranged material theologically more than chronologically — the temple scene at the beginning frames the whole ministry.

Reading one Gospel all the way through, then John all the way through, is the best way to feel the difference.
""",
            },
        ],
    },
    {
        "ref": "judas",
        "author": "editors",
        "tags": ["考察"],
        "title": "Does the Gospel of Judas say Judas was a good guy?",
        "body": """
I remember headlines in 2006 saying Judas was a hero after all. Is that what the text says?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
The first published interpretation in 2006 presented Judas as the one disciple who understood Jesus and did what Jesus asked. Soon after, other scholars argued that this reading depended on doubtful translations of damaged lines, and that the text presents Judas as a tragic figure, set apart but bound to the lower powers.

What is clear: Judas receives private teaching, and near the end Jesus tells him, in this site's translation, "you'll do more than all of them, because you'll sacrifice the human who bears me" (7:56). But Jesus also calls him "you thirteenth demon" (5:44) and says he will be "cursed by the other generations" (5:46). Whether being set apart is a privilege or a curse is still debated.

Read the text yourself; the brackets in the translation show you exactly where the manuscript is damaged.
""",
            },
        ],
    },
    {
        "ref": "song-of-songs",
        "author": "editors",
        "tags": ["考察"],
        "title": "Why is the Song of Songs in the Bible?",
        "body": """
It's a love poem, with no laws, no prophecy, and as far as I can tell almost nothing about God. How did it get in?
""",
        "answers": [
            {
                "author": "guides",
                "body": """
You're right that God is not clearly named in it. Its place in the canon was debated in antiquity; Rabbi Akiva is remembered for insisting that it is "the holy of holies" among the writings.

For most of history, Jewish readers heard it as a song of love between God and Israel, and Christian readers as love between Christ and the church, or God and the soul. Many modern readers take it first as what it plainly is — a celebration of human love and desire — and think that is reason enough to be in Scripture.

These readings are not mutually exclusive. Either way, 8:6–7 ("love is strong as death... many waters cannot quench love") is one of the great passages in the Bible.
""",
            },
        ],
    },
    # ── 回答の無い質問（利用者が最初に答えられるように） ────────────────────
    {
        "ref": "genesis 14:18",
        "author": "editors",
        "tags": ["考察"],
        "title": "Who was Melchizedek?",
        "body": """
A priest-king appears from nowhere, brings bread and wine, blesses Abraham, and disappears. Psalm 110:4 and Hebrews 7 make a great deal of him. What do you make of this figure?
""",
    },
    {
        "ref": "mark 11:14",
        "author": "editors",
        "tags": ["考察"],
        "title": "Why does Jesus curse the fig tree when it wasn't the season for figs?",
        "body": """
Mark 11:13 says plainly "the time of figs was not yet." Then Jesus curses the tree, and it withers. Mark sandwiches this around the temple scene. How do you read it?
""",
    },
    {
        "ref": "exodus 12:37",
        "author": "editors",
        "tags": ["考察"],
        "title": "How do you read the Exodus — as history, as memory, or as something else?",
        "body": """
"About six hundred thousand on foot that were men, beside children." Readers come to this story with very different assumptions about what kind of history it is. How do you read it, and what difference does it make to you?
""",
    },
    {
        "ref": "enoch 14",
        "author": "editors",
        "tags": ["考察"],
        "title": "How does Enoch's vision of the heavenly house compare with Isaiah 6 and Ezekiel 1?",
        "body": """
In Enoch 14 a house of crystal and fire, a throne, and a Great Glory. Isaiah sees the Lord on a throne in the temple; Ezekiel sees a throne above living creatures. What do these visions share, and where do they differ?
""",
    },
    # ── 日本語 ──────────────────────────────────────────────────────────────
    {
        "ref": "psalms 23",
        "author": "editors",
        "lang": "ja",
        "tags": ["解説"],
        "title": "口語訳と文語訳はどう違うのですか？",
        "body": """
訳の切り替えに「口語訳」と「文語訳」があります。どちらで読めばよいのでしょうか。
""",
        "answers": [
            {
                "author": "guides",
                "lang": "ja",
                "best": True,
                "body": """
どちらも日本の教会で長く読まれてきた訳です。

- 文語訳 … 明治期に訳された旧約と、大正期に改訳された新約。文語体で、「元始に神天地を創造たまへり」のような格調のある文章です。日本の近代文学にも大きな影響を与えました。
- 口語訳 … 1950 年代に出た、話し言葉の訳。いま読んで意味がそのまま分かる文章です。

はじめて読むなら口語訳、声に出して味わいたいときや有名な一節を読むときは文語訳、という使い分けがおすすめです。詩篇 23 篇は、両方で読み比べるのにちょうどよい箇所です。
""",
            },
        ],
    },
    {
        "ref": "exodus 3:15",
        "author": "editors",
        "lang": "ja",
        "tags": ["解説"],
        "title": "「主」「ヱホバ」「LORD」は同じ名前ですか？",
        "body": """
口語訳では「主」、文語訳では「ヱホバ」、KJV では大文字の "LORD" になっている箇所があります。同じ言葉なのでしょうか。
""",
        "answers": [
            {
                "author": "guides",
                "lang": "ja",
                "best": True,
                "body": """
同じ言葉です。ヘブライ語本文では、神の固有の名を表す四つの子音（YHWH）が書かれています。

ユダヤ教では、この名を声に出さず「主（アドナイ）」と読み替える習慣があり、ギリシャ語訳（七十人訳）も「主」と訳しました。KJV が大文字の "LORD" と書くのは、ここが普通の「主」ではなく神の名であることを示すためです。

文語訳の「ヱホバ」は、子音に「アドナイ」の母音記号を組み合わせて読んだ形から来ています。現在の学者の多くは、元の発音を「ヤハウェ」に近いものと推定しています。訳の切り替えで WLC（ヘブライ語）を開くと、もとの四文字を見ることができます。
""",
            },
        ],
    },
    {
        "ref": "@uchimura-romans",
        "author": "editors",
        "lang": "ja",
        "tags": ["解説"],
        "title": "内村鑑三の『ロマ書の研究』はどんな本ですか？",
        "body": """
解釈書の一覧に、カルヴァンなどと並んで内村鑑三の名前がありました。どんな本で、どう読めばよいでしょうか。
""",
        "answers": [
            {
                "author": "guides",
                "lang": "ja",
                "best": True,
                "body": """
内村鑑三（1861〜1930）は、教会の制度によらずに聖書を読む「無教会」の運動を始めた、日本のキリスト者です。『ロマ書の研究』は、彼が東京で行ったロマ書の連続講演をまとめた本で、全 60 講（と序）からなります。

読み方のおすすめは、ロマ書の本文と並べることです。講は本文の順に進むので、たとえばロマ書 7 章を読んだら、「潔めらるること」の講を開く、という具合です。読書プラン「内村鑑三と読むロマ書」で、章と講の組み合わせを日ごとに並べてあります。

英語の読者向けに補うと、Uchimura Kanzō はキリスト教に関心のある海外の読者にも知られた、明治から昭和初期の日本の思想家です。
""",
            },
        ],
    },
    {
        "ref": "luke 8:2",
        "author": "editors",
        "lang": "ja",
        "tags": ["考察"],
        "title": "マグダラのマリヤは「罪の女」だったのですか？",
        "body": """
映画や絵画では、マグダラのマリヤが悔い改めた罪深い女として描かれることがあります。聖書にそう書いてあるのでしょうか。
""",
        "answers": [
            {
                "author": "guides",
                "lang": "ja",
                "best": True,
                "body": """
書いてありません。

ルカ 8:2 は、マグダラのマリヤを「七つの悪霊を追い出していただいた」女性として紹介しています。その直前、ルカ 7 章でイエスの足に香油を塗る「罪の女」は、名前が書かれていません。

この二人（さらにベタニヤのマリヤ）を同じ人物とみなす読み方は、6 世紀末の教皇グレゴリウス 1 世の説教によって西方教会に広まりました。東方教会はこの同一視をせず、彼女を復活の最初の証人として「使徒に等しい」と呼んできました。カトリック教会も、20 世紀の典礼改革でこの同一視を改めています。

マグダラのマリヤについては、ヨハネ 20 章と、このサイトで読める「マリアの福音書」も併せて読んでみてください。
""",
            },
        ],
    },
    {
        "ref": "mark",
        "author": "editors",
        "lang": "ja",
        "tags": ["解説"],
        "title": "聖書をはじめて読むなら、どこから読めばいいですか？",
        "body": """
創世記から順に読もうとして、途中で挫折しました。おすすめの入り口はありますか。
""",
        "answers": [
            {
                "author": "guides",
                "lang": "ja",
                "best": True,
                "body": """
マルコによる福音書をおすすめします。四つの福音書の中でいちばん短く、出来事がテンポよく進むので、一気に読めます（通して 1 時間半ほどです）。

そのあとは、気になったところに枝を伸ばすのがよいと思います。

- 物語が好きなら … 創世記の 37〜50 章（ヨセフの物語）、ルツ記
- 詩や言葉が好きなら … 詩篇、伝道の書
- 正典の外も読んでみたいなら … トマスの福音書（短い言葉の集まりなので、どこからでも読めます）

読書プランの「はじめての一週間」も、入り口として作ってあります。
""",
            },
        ],
    },
    {
        "ref": "wisdom",
        "author": "editors",
        "lang": "ja",
        "tags": ["解説"],
        "title": "「外典」と「偽典」はどう違うのですか？",
        "body": """
知恵の書は「外典」、エノク書は「偽典」と呼ばれているのを見ました。どう違うのでしょうか。
""",
        "answers": [
            {
                "author": "guides",
                "lang": "ja",
                "body": """
日本語での一般的な使い分けは次のとおりです。

- 外典（旧約続編・第二正典）… トビト記、ユディト記、知恵の書、シラ書、マカバイ記など。ギリシャ語の旧約（七十人訳）に入っていて、カトリック教会と正教会では聖書の一部です。プロテスタントでは聖書に数えません。日本では新共同訳などが「旧約聖書続編」として収めています。
- 偽典 … エノク書、ヨベル書など、古代の人物の名を冠して書かれ、ほとんどの教会が聖書に入れなかった文書。ただしエチオピア正教会は、エノク書とヨベル書を旧約聖書に含めています。

このように、ある教会の「外典」「偽典」が、別の教会では聖書そのもの、ということが起こります。NeON Church がこれらの書を区別せず同じ棚に並べているのはそのためです。
""",
            },
        ],
    },
]
