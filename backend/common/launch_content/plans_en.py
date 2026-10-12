"""
読書プラン（英語）。

日ごとに読む章（readings）と、案内係の短い文章（devotional）を持つ。
1 日に読む章は 10 まで、プランは 365 日まで（plans/models.py の上限）。

通読プラン（1 年で聖書全体など）は、日ごとに文章を書かず、章を均等に割り振って作る。
"""

# ── 通読プランを作る道具 ────────────────────────────────────────────────────

# 書の slug・英語名・章数（KJV の章立て）。通読プランの日割りと、日の題に使う。
CANON_66 = [
    ("genesis", "Genesis", 50), ("exodus", "Exodus", 40), ("leviticus", "Leviticus", 27),
    ("numbers", "Numbers", 36), ("deuteronomy", "Deuteronomy", 34), ("joshua", "Joshua", 24),
    ("judges", "Judges", 21), ("ruth", "Ruth", 4), ("1-samuel", "1 Samuel", 31),
    ("2-samuel", "2 Samuel", 24), ("1-kings", "1 Kings", 22), ("2-kings", "2 Kings", 25),
    ("1-chronicles", "1 Chronicles", 29), ("2-chronicles", "2 Chronicles", 36),
    ("ezra", "Ezra", 10), ("nehemiah", "Nehemiah", 13), ("esther", "Esther", 10),
    ("job", "Job", 42), ("psalms", "Psalms", 150), ("proverbs", "Proverbs", 31),
    ("ecclesiastes", "Ecclesiastes", 12), ("song-of-songs", "Song of Songs", 8),
    ("isaiah", "Isaiah", 66), ("jeremiah", "Jeremiah", 52), ("lamentations", "Lamentations", 5),
    ("ezekiel", "Ezekiel", 48), ("daniel", "Daniel", 12), ("hosea", "Hosea", 14),
    ("joel", "Joel", 3), ("amos", "Amos", 9), ("obadiah", "Obadiah", 1), ("jonah", "Jonah", 4),
    ("micah", "Micah", 7), ("nahum", "Nahum", 3), ("habakkuk", "Habakkuk", 3),
    ("zephaniah", "Zephaniah", 3), ("haggai", "Haggai", 2), ("zechariah", "Zechariah", 14),
    ("malachi", "Malachi", 4), ("matthew", "Matthew", 28), ("mark", "Mark", 16),
    ("luke", "Luke", 24), ("john", "John", 21), ("acts", "Acts", 28), ("romans", "Romans", 16),
    ("1-corinthians", "1 Corinthians", 16), ("2-corinthians", "2 Corinthians", 13),
    ("galatians", "Galatians", 6), ("ephesians", "Ephesians", 6),
    ("philippians", "Philippians", 4), ("colossians", "Colossians", 4),
    ("1-thessalonians", "1 Thessalonians", 5), ("2-thessalonians", "2 Thessalonians", 3),
    ("1-timothy", "1 Timothy", 6), ("2-timothy", "2 Timothy", 4), ("titus", "Titus", 3),
    ("philemon", "Philemon", 1), ("hebrews", "Hebrews", 13), ("james", "James", 5),
    ("1-peter", "1 Peter", 5), ("2-peter", "2 Peter", 3), ("1-john", "1 John", 5),
    ("2-john", "2 John", 1), ("3-john", "3 John", 1), ("jude", "Jude", 1),
    ("revelation", "Revelation", 22),
]

# 第二正典（カトリック・正教会の旧約に入る書と、正教会などが読む書）。
DEUTEROCANON = [
    ("tobit", "Tobit", 14), ("judith", "Judith", 16), ("wisdom", "Wisdom", 19),
    ("sirach", "Sirach", 51), ("baruch", "Baruch", 5),
    ("epistle-of-jeremy", "Letter of Jeremiah", 1), ("susanna", "Susanna", 1),
    ("bel-and-the-dragon", "Bel and the Dragon", 1),
    ("1-maccabees", "1 Maccabees", 16), ("2-maccabees", "2 Maccabees", 15),
    ("1-esdras", "1 Esdras", 9), ("prayer-of-manasseh", "Prayer of Manasseh", 1),
    ("3-maccabees", "3 Maccabees", 7), ("4-maccabees", "4 Maccabees", 18),
]


def _spread(books, days):
    """書の章を順に並べ、days 日にできるだけ均等に割り振る。日の題は「Genesis 1–4」の形。"""
    chapters = [(slug, name, n) for slug, name, count in books for n in range(1, count + 1)]
    total = len(chapters)
    plan_days = []
    for day in range(days):
        chunk = chapters[day * total // days:(day + 1) * total // days]
        first, last = chunk[0], chunk[-1]
        if first[0] == last[0]:
            title = f"{first[1]} {first[2]}" + (f"–{last[2]}" if last[2] != first[2] else "")
        else:
            title = f"{first[1]} {first[2]} – {last[1]} {last[2]}"
        plan_days.append({
            "title": title,
            "readings": [f"{slug} {n}" for slug, _name, n in chunk],
        })
    return plan_days


def _paired(book, works, chapters):
    """聖書の章と、同じ章の解釈書を並べて読む日を作る（例: romans 8 と @calvin-romans 8）。"""
    return [
        [f"{book} {n}", *(f"@{work} {n}" for work in works)]
        for n in chapters
    ]


# ── プラン ──────────────────────────────────────────────────────────────────

_ROMANS_DEVOTIONALS = [
    ("Paul introduces himself", "Paul writes to a church he has never visited. Notice how long the greeting is (1:1–7) before he gets to the point, and then the turn at 1:16–17: \"I am not ashamed of the gospel.\" Calvin reads 1:17 as the explanation of 1:16: the gospel saves because it reveals God's righteousness. If you are short on time, read his notes on those two verses first."),
    ("No one is excused", "Chapter 2 turns the accusation of chapter 1 back on the reader: \"thou art inexcusable, O man, whosoever thou art that judgest\" (2:1). Watch how Calvin handles the Gentiles who \"do by nature the things contained in the law\" (2:14), a verse readers have argued over for centuries."),
    ("The righteousness of God", "\"All have sinned\" (3:23) is famous; less often quoted is the sentence it belongs to, which goes on to say they are \"justified freely by his grace\" (3:24). Read 3:21–26 slowly. On 3:24 Calvin writes that there is \"perhaps, no passage in the whole Scripture\" that shows more strikingly the efficacy of God's righteousness."),
    ("Abraham believed", "Paul's test case is Abraham, who \"believed God, and it was counted unto him for righteousness\" (4:3, quoting Genesis 15:6). Compare James 2:21–24, which uses the same Abraham to make what sounds like the opposite point; the editors' thread on James 2:24 asks whether the two really disagree."),
    ("Adam and Christ", "5:12–21 sets two figures side by side: one man through whom sin entered, and one through whom grace abounds \"much more.\" Count the \"much more\"s. The comparison is built so that the second always outweighs the first."),
    ("Dead to sin", "\"Shall we continue in sin, that grace may abound? God forbid\" (6:1–2). Paul answers an objection his own teaching invites. Baptism (6:3–4) is his answer. See what Calvin makes of being \"buried with him.\""),
    ("The divided self", "\"For the good that I would I do not\" (7:19). Is the speaker Paul before faith, Paul as a believer, or humanity under the law? Calvin takes a clear position: from 7:15 on, he says, Paul describes \"a man already regenerated.\" Read the chapter first and decide what you think before you see his."),
    ("No condemnation", "From \"There is therefore now no condemnation\" (8:1) to nothing \"shall be able to separate us from the love of God\" (8:39): the chapter climbs the whole way. In the middle, creation itself groans (8:22). If you only read one chapter of Romans in your life, many readers would choose this one."),
    ("Israel and the promise", "Chapters 9–11 are Paul wrestling with why most of his own people have not believed. Chapter 9 opens with grief (9:1–3) before it says anything about election. Calvin's reading of this chapter has been enormously influential and is often argued with; read it as one strong voice, not the last word."),
    ("The word is near", "\"The word is nigh thee, even in thy mouth, and in thy heart\" (10:8). Paul quotes Deuteronomy 30 to say that faith is not a distant achievement. Notice how many Old Testament quotations this chapter strings together."),
    ("The olive tree", "Gentile believers are branches grafted into an olive tree that is not theirs (11:17–24). \"Boast not against the branches.\" The chapter ends not in an argument but in doxology: \"O the depth of the riches...\" (11:33)."),
    ("A living sacrifice", "The letter turns from doctrine to life: \"present your bodies a living sacrifice\" (12:1). Then a list of short, practical commands — easy to read, hard to live."),
    ("Love fulfills the law", "13:1–7 on governing authorities has been used and abused for centuries; read it next to 13:8–10, where every commandment is summed up in love of neighbor. Calvin's comments on 13:1–7 are part of a long and contested history."),
    ("The weak and the strong", "Some believers eat anything; some eat only vegetables. Paul refuses to settle the question and instead tells both sides not to judge (14:3). A chapter about food that is really about how communities live with disagreement."),
    ("To Spain by way of Rome", "Paul explains his travel plans: Jerusalem first, with the collection for the poor, then Rome, then Spain (15:24–28). The theology of the letter ends in a fundraising journey. Romans was written by a missionary on the road."),
    ("Greetings", "Do not skip the names. Phoebe, a \"servant\" (in Greek, diakonos) of the church at Cenchrea, is commended first (16:1). Priscilla is named before her husband Aquila (16:3). Junia is \"of note among the apostles\" (16:7). This list tells you who the church in Rome actually was."),
]

PLANS = [
    {
        "author": "guides",
        "title": "Seven Doors: Your First Week on NeON Church",
        "description": (
            "Seven short readings that open seven different doors into the library: a creation hymn, "
            "a gospel prologue, a psalm, a parable, a vision from Enoch, sayings from Thomas, and the "
            "last page of Revelation."
        ),
        "note": "New here? This plan takes about ten minutes a day. Try the translation switcher on any day — that's half the point.",
        "days": [
            {
                "title": "A world spoken into being",
                "readings": ["genesis 1"],
                "devotional": "The first page of the Bible is built like a song, with a refrain that returns each day: \"And God said... and it was so... and God saw that it was good.\" Read it once for the story, then once just listening for the repetition. If you are curious, open the Hebrew (WLC) beside the KJV and watch the same pattern repeat on the other side of the screen.",
            },
            {
                "title": "The Word in the beginning",
                "readings": ["john 1"],
                "devotional": "John's Gospel opens with the same words as Genesis: \"In the beginning.\" No manger, no genealogy — a Word that was with God and was God, and light shining in darkness. Notice how quickly the chapter comes down to earth: by verse 29 we are by a river, with John the Baptist pointing at a man walking past.",
            },
            {
                "title": "A psalm for the valley",
                "readings": ["psalms 23"],
                "devotional": "Psalm 23 may be the most familiar poem in the Bible. Watch the pronouns: the psalm speaks about God (\"he leadeth me\") until the dark valley, and then speaks to God (\"thou art with me\"). If you read Japanese, compare 口語訳 and 文語訳 — the older version is still the one many people know by heart.",
            },
            {
                "title": "Two sons and a father",
                "readings": ["luke 15"],
                "devotional": "Three parables of lost things: a sheep, a coin, a son. The last one is really about two sons, and it ends with the elder brother standing outside the party while his father pleads with him. We never learn whether he went in. Ask yourself which son you are reading as.",
            },
            {
                "title": "The vision of Enoch",
                "readings": ["enoch 1"],
                "devotional": "Today a book most Bibles do not include. 1 Enoch opens with a vision of God coming to judge the earth — and verse 9 is quoted almost word for word in the New Testament Letter of Jude (Jude 14–15). Read it as early readers did: as a voice that some communities treasured as prophecy.",
            },
            {
                "title": "Hidden sayings",
                "readings": ["thomas 0", "thomas 1", "thomas 2", "thomas 3", "thomas 4", "thomas 5"],
                "devotional": "The Gospel of Thomas has no story at all — just sayings, numbered one to 114. On this site each saying is a chapter. Today's are the first five, beginning with a promise: \"Whoever discovers the meaning of these sayings won't taste death.\" Some will sound familiar from Matthew and Luke. Some will not.",
            },
            {
                "title": "All things new",
                "readings": ["revelation 21", "revelation 22"],
                "devotional": "The Bible's last pages return to its first: a tree of life, a river, light without a sun. After long chapters of conflict, God wipes away every tear (21:4). Whatever you make of Revelation, notice how deliberately it closes the circle Genesis opened. That's the end of the week — the library is yours.",
            },
        ],
    },
    {
        "author": "guides",
        "title": "Beginnings: Genesis 1–11 with the Book of the Watchers",
        "description": (
            "Two weeks through the first eleven chapters of Genesis, with a three-day detour into "
            "1 Enoch 6–11, which tells the story behind Genesis 6:1–4 at length."
        ),
        "note": "Days 7–9 read 1 Enoch in R. H. Charles's English translation, the only edition on the site.",
        "days": [
            {"title": "Order out of chaos", "readings": ["genesis 1"], "devotional": "Before anything is made, the earth is \"without form, and void.\" The six days answer that: days one to three make spaces (light and dark, sky and sea, land), days four to six fill them (lights, birds and fish, animals and people). Look for the pattern as you read."},
            {"title": "Dust and breath", "readings": ["genesis 2"], "devotional": "A second creation story, closer to the ground. God forms the man from dust and breathes into him; the first thing called \"not good\" is loneliness (2:18). Notice that the English shifts from \"God\" to \"the LORD God\" at 2:4 — the Hebrew adds the divine name."},
            {"title": "The serpent's question", "readings": ["genesis 3"], "devotional": "The serpent never orders the woman to eat; it asks a question and makes a prediction. Several of its predictions come true (3:5, 3:7, 3:22). The chapter is less simple than its reputation. Read the comments on 3:1 for several different ways in."},
            {"title": "Am I my brother's keeper?", "readings": ["genesis 4"], "devotional": "The first murder follows the first act of worship. God warns Cain before he acts: \"sin lieth at the door... and thou shalt rule over him\" (4:7). And after the murder, God protects the murderer with a mark. Judgment and mercy are tangled from the beginning."},
            {"title": "Enoch walked with God", "readings": ["genesis 5"], "devotional": "A genealogy — and in the middle of it, one strange line: \"Enoch walked with God: and he was not; for God took him\" (5:24). That single verse gave rise to a whole literature. Tomorrow you will read Genesis 6; after that, three days in the book that bears Enoch's name."},
            {"title": "Sons of God and daughters of men", "readings": ["genesis 6"], "devotional": "Genesis 6:1–4 is four of the most puzzling verses in the Bible: \"sons of God\" take human wives, and there are \"giants in the earth.\" Then God sees that the wickedness of humanity is great, and the flood story begins. Hold on to those four verses; the next three days are about them."},
            {"title": "The oath on Mount Hermon", "readings": ["enoch 6", "enoch 7"], "devotional": "Here the four verses of Genesis 6 become a full story. Two hundred angels — \"the children of the heaven\" — swear an oath together on Mount Hermon, take wives, and father giants who devour the earth. Notice the leader's fear in 6:3: he does not want to bear the sin alone, so he makes it collective."},
            {"title": "Forbidden knowledge", "readings": ["enoch 8", "enoch 9"], "devotional": "Chapter 8 lists what the Watchers taught: weapons, metalwork, cosmetics, sorcery, astrology. In chapter 9 the archangels look down, see the bloodshed, and bring the cry of the earth before God. The story places blame on heaven before it places it on humanity."},
            {"title": "Judgment and a promise", "readings": ["enoch 10", "enoch 11"], "devotional": "God sends the archangels: Raphael binds Azazel, Gabriel turns the giants against one another, Michael binds Semjaza. A warning of the flood goes to Noah. Then a vision of renewal: the earth cleansed, and \"truth and peace shall be associated together\" (11:2). Compare this ending with Genesis 8–9."},
            {"title": "The flood", "readings": ["genesis 7"], "devotional": "Back to Genesis. The waters rise for forty days and prevail for a hundred and fifty. The narration is slow and repetitive on purpose — the same phrases return like the water. Having read Enoch, notice how little Genesis says about why the earth had become so violent."},
            {"title": "God remembered Noah", "readings": ["genesis 8"], "devotional": "The turning point of the flood is a single phrase: \"And God remembered Noah\" (8:1). The raven, the dove, the olive leaf. And a promise that comes with an honest observation: God will not curse the ground again, \"for the imagination of man's heart is evil from his youth\" (8:21). The flood has not changed people."},
            {"title": "A bow in the cloud", "readings": ["genesis 9"], "devotional": "The covenant with Noah is made with \"every living creature\" (9:10), not only humans. The rainbow is a sign for God to remember (9:16). Then the chapter ends with Noah drunk and a curse on Canaan — a reminder that new beginnings do not stay clean for long."},
            {"title": "The table of nations", "readings": ["genesis 10"], "devotional": "A long list of peoples descended from Noah's sons. Skim if you like, but notice the refrain: each family is listed \"after their families, after their tongues\" (10:20, 31; compare 10:5). Diversity of language is presented here as the natural result of growth — before tomorrow's chapter tells it differently."},
            {"title": "The tower", "readings": ["genesis 11"], "devotional": "Humanity, speaking one language, builds a tower \"whose top may reach unto heaven\" (11:4). God scatters them. Then the chapter narrows to one family, and ends with Abram. Genesis 1–11 has told the story of the whole world; from here it follows one man's journey."},
        ],
    },
    {
        "author": "guides",
        "title": "Mark in 16 Days",
        "description": "The shortest Gospel, one chapter a day. Mark moves fast — this plan keeps pace with short notes for each day.",
        "days": [
            {"title": "The beginning of the gospel", "readings": ["mark 1"], "devotional": "No birth story, no genealogy — Mark begins with John the Baptist and an adult Jesus. Count how many times you see \"straightway\" or \"immediately.\" Mark's urgency is part of his message."},
            {"title": "Who can forgive sins?", "readings": ["mark 2"], "devotional": "Four friends dig through a roof. Jesus says \"thy sins be forgiven thee\" before he heals, and the argument begins. This chapter is a string of controversies: forgiveness, eating with sinners, fasting, the sabbath."},
            {"title": "Who are my mother and brothers?", "readings": ["mark 3"], "devotional": "His family thinks he is out of his mind (3:21); the scribes think he is possessed (3:22). Jesus looks at the crowd around him: \"whosoever shall do the will of God, the same is my brother, and my sister, and mother\" (3:35)."},
            {"title": "Seeds and storms", "readings": ["mark 4"], "devotional": "Parables of seeds — the sower, the seed growing secretly, the mustard seed — and then a storm on the lake. \"Why are ye so fearful?\" The disciples' last question is the reader's: \"What manner of man is this?\""},
            {"title": "Legion, and a girl", "readings": ["mark 5"], "devotional": "A man living among tombs, a woman who touches Jesus' clothes, a twelve-year-old girl. Mark sandwiches one story inside another: the healing of the woman interrupts the journey to the girl. Watch how the two stories echo each other — twelve years each."},
            {"title": "A prophet without honor", "readings": ["mark 6"], "devotional": "Rejected in his home town; then the death of John the Baptist; then bread for five thousand; then walking on water. The disciples \"considered not the miracle of the loaves: for their heart was hardened\" (6:52). Mark is hard on the disciples."},
            {"title": "What defiles", "readings": ["mark 7"], "devotional": "A debate about washing hands becomes a saying about the heart. Then a Gentile woman argues with Jesus — \"yet the dogs under the table eat of the children's crumbs\" (7:28) — and wins. She is one of the few people in Mark who answers him well."},
            {"title": "Who do you say I am?", "readings": ["mark 8"], "devotional": "The center of the Gospel. A blind man is healed in two stages (8:22–26) — and then Peter sees who Jesus is, but only halfway: he names him the Christ and then rebukes him for speaking of suffering. From here on, Jesus walks toward Jerusalem."},
            {"title": "On the mountain and below it", "readings": ["mark 9"], "devotional": "The transfiguration, and right below the mountain, a father who cries \"Lord, I believe; help thou mine unbelief\" (9:24). Belief and unbelief in one sentence may be the most honest prayer in the Gospels."},
            {"title": "The last will be first", "readings": ["mark 10"], "devotional": "A rich man goes away sad. James and John ask for the best seats. Blind Bartimaeus asks only to see — and follows Jesus \"in the way\" (10:52). The chapter keeps asking what kind of greatness Jesus means."},
            {"title": "The king on a colt", "readings": ["mark 11"], "devotional": "Palm branches, a cursed fig tree, overturned tables in the temple. Mark wraps the temple scene inside the fig tree story; the two explain each other. Holy Week has begun."},
            {"title": "Questions in the temple", "readings": ["mark 12"], "devotional": "Tax, resurrection, the greatest commandment. Everyone tries to trap him with a question. The chapter ends with a widow putting in two coins, \"all her living\" (12:44) — praised, or lamented? Readers disagree."},
            {"title": "Watch", "readings": ["mark 13"], "devotional": "Jesus' longest speech in Mark: the temple will fall, wars and false messiahs will come. It ends with a single word repeated: \"Watch.\" Notice that Jesus says no one knows the day, \"neither the Son\" (13:32)."},
            {"title": "Anointing and betrayal", "readings": ["mark 14"], "devotional": "A woman anoints him; Judas goes to the priests. Bread and cup; Gethsemane; arrest. A young man flees naked (14:51–52) — a strange detail only Mark keeps. Then Peter's denial, while Jesus confesses before the high priest."},
            {"title": "The cross", "readings": ["mark 15"], "devotional": "\"My God, my God, why hast thou forsaken me?\" — the only words Jesus speaks from the cross in Mark. It is a Roman centurion, watching him die, who says \"Truly this man was the Son of God\" (15:39). Read slowly."},
            {"title": "For they were afraid", "readings": ["mark 16"], "devotional": "The oldest manuscripts of Mark end at 16:8: the women flee the empty tomb, \"for they were afraid.\" Switch to Nestle 1904 (GRC) to see verses 9–20 in double brackets. Whether you read the short or long ending, notice that Mark leaves the last step — telling — to the reader."},
        ],
    },
    {
        "author": "editors",
        "title": "The Sayings of Jesus: Sermon on the Mount, Q, and Thomas",
        "description": "A week comparing three collections of Jesus' sayings: Matthew's Sermon on the Mount, the reconstructed source Q, and the Gospel of Thomas. Same voice, different editors.",
        "days": [
            {"title": "Blessed are...", "readings": ["matthew 5"], "devotional": "The Beatitudes, then six sayings of the form \"Ye have heard that it was said... but I say unto you.\" Matthew has arranged these deliberately. Keep a note of which sayings strike you; you will meet some of them again in other forms this week."},
            {"title": "In secret", "readings": ["matthew 6"], "devotional": "Giving, praying, fasting — each to be done \"in secret.\" The Lord's Prayer sits in the middle. Switch to Nestle 1904 (GRC) at 6:13 and see that the closing doxology is missing from the earlier Greek text."},
            {"title": "Ask, seek, knock", "readings": ["matthew 7"], "devotional": "Do not judge; ask and it will be given; the narrow gate; the house on the rock. Matthew's sermon ends with the crowds astonished, because he taught \"as one having authority\" (7:29)."},
            {"title": "On the plain", "readings": ["luke 6", "quelle 6"], "devotional": "Luke's version of the sermon is shorter and happens on a plain (6:17). His Beatitudes are blunter — \"Blessed be ye poor\" — and come with woes. Then read the reconstructed Q, built from what Matthew and Luke share. What does each Gospel add?"},
            {"title": "Teach us to pray", "readings": ["luke 11", "quelle 11"], "devotional": "Luke's Lord's Prayer is shorter than Matthew's. The Q reconstruction is shorter still. Comparing the three is a good way to see what scholars mean when they talk about the earliest form of a saying."},
            {"title": "Seek and find", "readings": ["thomas 2", "thomas 3", "thomas 5", "thomas 6", "thomas 14", "thomas 42"], "devotional": "Now the Gospel of Thomas. Saying 2 promises that whoever seeks will be disturbed, then amazed. Saying 6 asks about fasting, prayer, and giving — the same three practices as Matthew 6 — and about food; saying 14 answers very differently. Saying 42 is just two words: \"Become passersby.\""},
            {"title": "The kingdom is spread out", "readings": ["thomas 20", "thomas 54", "thomas 77", "thomas 107", "thomas 113", "thomas 114"], "devotional": "The mustard seed (20) and the lost sheep (107) appear in Matthew and Luke too — compare the details. Saying 113 ends: \"the Father's kingdom is already spread out over the earth, and people don't see it.\" And saying 114, the last, is one of the most debated sentences in early Christian literature. Read the comments and add your own."},
        ],
    },
    {
        "author": "guides",
        "title": "Wisdom in 14 Days",
        "description": "Proverbs, Job, Ecclesiastes, the Wisdom of Solomon and Sirach: two weeks with the Bible's thinkers, from confident advice to furious protest.",
        "note": "Wisdom and Sirach are in Catholic and Orthodox Bibles and among the Protestant Apocrypha. The translation here is Brenton's.",
        "days": [
            {"title": "The fear of the Lord", "readings": ["proverbs 1"], "devotional": "\"The fear of the LORD is the beginning of knowledge\" (1:7). Proverbs opens with a father's voice and then a second voice: Wisdom herself, crying in the street (1:20). Wisdom will keep showing up as a person."},
            {"title": "Wisdom at creation", "readings": ["proverbs 8"], "devotional": "Wisdom speaks: \"The LORD possessed me in the beginning of his way\" (8:22). She was there when the heavens were set in place, \"rejoicing always before him.\" Early Christians read this chapter when they thought about Christ. Keep it in mind for day 12."},
            {"title": "A woman of strength", "readings": ["proverbs 31"], "devotional": "The book ends with an acrostic poem about a capable woman: she trades, buys fields, plants vineyards, speaks with wisdom. After a book full of advice to young men, the last portrait of wisdom is a woman at work."},
            {"title": "A test in heaven", "readings": ["job 1"], "devotional": "The frame story: a blameless man, a wager in the heavenly court, and disaster. Job's first response is famous: \"the LORD gave, and the LORD hath taken away\" (1:21). It will not be his last word."},
            {"title": "Let the day perish", "readings": ["job 3"], "devotional": "Job curses the day he was born. This is where the poetry begins and where the book's real question opens. Notice that Job never curses God — but he comes close to cursing creation itself."},
            {"title": "Out of the whirlwind", "readings": ["job 38"], "devotional": "After thirty-five chapters of argument, God speaks — and does not explain. \"Where wast thou when I laid the foundations of the earth?\" Instead of reasons, a tour of creation: stars, sea, snow, lions, ravens. Is it an answer?"},
            {"title": "Spoken rightly", "readings": ["job 42"], "devotional": "Job repents \"in dust and ashes.\" Then God tells the friends they have not spoken rightly \"as my servant Job hath\" (42:7). The angry man is vindicated over the pious defenders. Then everything is restored double — and readers have argued about that ending ever since."},
            {"title": "Vapor", "readings": ["ecclesiastes 1"], "devotional": "\"Vanity of vanities.\" The Hebrew word suggests breath or vapor — something real but fleeting. The sun rises and sets, rivers run to the sea, and \"there is no new thing under the sun.\" Is that despair or calm?"},
            {"title": "A time for everything", "readings": ["ecclesiastes 3"], "devotional": "A time to be born and a time to die. The famous list is followed by a strange gift: God \"hath set the world in their heart\" (3:11) — 口語訳: \"人の心に永遠を思う思いを授けられた.\" We can think of eternity but cannot see the whole."},
            {"title": "Remember now", "readings": ["ecclesiastes 12"], "devotional": "\"Remember now thy Creator in the days of thy youth\" — followed by one of the most beautiful descriptions of aging in literature, as a house falling quiet. Then the book's last words. Do they sum up the book, or tame it?"},
            {"title": "The reasoning of the ungodly", "readings": ["wisdom 2"], "devotional": "The Wisdom of Solomon gives voice to people who think life is short and death final, and who decide to enjoy themselves and oppress the righteous man who annoys them. Then: \"God created man to be immortal\" (2:23). Compare Ecclesiastes."},
            {"title": "The breath of the power of God", "readings": ["wisdom 7"], "devotional": "Wisdom is \"the breath of the power of God,\" \"the brightness of the everlasting light\" (7:25–26). Hebrews 1:3 uses similar language about Christ. Read this next to Proverbs 8 and John 1 and you can see an idea growing across centuries."},
            {"title": "All wisdom is from the Lord", "readings": ["sirach 1"], "devotional": "Sirach was written in Hebrew and translated into Greek by the author's grandson. Its first chapter is a hymn to wisdom, and its practical advice follows for fifty chapters. Notice how close its tone is to Proverbs."},
            {"title": "Let us now praise famous men", "readings": ["sirach 44"], "devotional": "Near its end Sirach gives a long praise of ancestors, from Enoch to the high priest Simon. And a moving line for those not remembered: \"some there be, which have no memorial\" (44:9). Compare Ecclesiastes 1:11. Two wise men, two views of being forgotten."},
        ],
    },
    {
        "author": "guides",
        "title": "Psalms for Hard Days",
        "description": "Ten psalms of lament, confession and trust, for days when the words won't come. The psalms do not tidy grief up. Neither does this plan.",
        "days": [
            {"title": "How long?", "readings": ["psalms 13"], "devotional": "\"How long wilt thou forget me, O LORD? for ever?\" Four times \"how long\" in two verses. Then, without explanation, the psalm ends in trust. Laments often turn like this. You do not have to turn with it today."},
            {"title": "Why hast thou forsaken me?", "readings": ["psalms 22"], "devotional": "The words Jesus cried from the cross in Mark and Matthew. Read the whole psalm: the abandonment is real, and so is the praise that comes later. Neither cancels the other."},
            {"title": "As the hart panteth", "readings": ["psalms 42"], "devotional": "Thirst, tears for food, the memory of better days. And a voice talking to itself: \"Why art thou cast down, O my soul?\" The psalm argues with despair from the inside."},
            {"title": "A clean heart", "readings": ["psalms 51"], "devotional": "The great psalm of confession, which the heading links to David after Bathsheba. \"Create in me a clean heart, O God.\" It asks for more than forgiveness — it asks to be made new."},
            {"title": "Darkness is my companion", "readings": ["psalms 88"], "devotional": "The darkest psalm. There is no turn to praise; it ends with darkness. That it is in the Bible at all says something: some prayers end without resolution, and they are still prayers."},
            {"title": "Teach us to number our days", "readings": ["psalms 90"], "devotional": "The only psalm attributed to Moses. A thousand years are as yesterday; our lives are \"as a tale that is told.\" Its request is modest: \"teach us to number our days, that we may apply our hearts unto wisdom.\""},
            {"title": "I will lift up mine eyes", "readings": ["psalms 121"], "devotional": "A song for travelers, one of the \"Songs of Degrees\" probably sung on the way to Jerusalem. \"He that keepeth thee will not slumber.\" Short enough to learn by heart."},
            {"title": "Out of the depths", "readings": ["psalms 130"], "devotional": "\"Out of the depths have I cried unto thee.\" Then waiting: \"more than they that watch for the morning\" — said twice. Waiting is the shape of this psalm."},
            {"title": "Thou hast searched me", "readings": ["psalms 139"], "devotional": "Being fully known can be comfort or threat. The psalmist cannot escape God — not in heaven, not in the grave, not in the dark. Notice the violent turn in verses 19–22, and the return to quiet at the end."},
            {"title": "Thou art with me", "readings": ["psalms 23"], "devotional": "The plan ends where many people begin. After ten days of lament, read this psalm again. The valley of the shadow of death is still there. So is the table, and the cup that runs over."},
        ],
    },
    {
        "author": "editors",
        "title": "Women Who Spoke: From Ruth to Mary Magdalene",
        "description": "Ten days with women whose words change their stories — in the Hebrew Bible, the deuterocanon, the Gospels, and the Gospels outside the canon.",
        "days": [
            {"title": "Ruth: whither thou goest", "readings": ["ruth 1"], "devotional": "\"Whither thou goest, I will go.\" A Moabite widow refuses to leave her mother-in-law. The book never tells us why. She becomes the great-grandmother of David."},
            {"title": "Esther: for such a time as this", "readings": ["esther 4"], "devotional": "Mordecai's challenge: \"who knoweth whether thou art come to the kingdom for such a time as this?\" (4:14). Esther's answer: \"if I perish, I perish.\" In Hebrew Esther, God is never named — the courage is all on the page."},
            {"title": "Judith rebukes the elders", "readings": ["judith 8"], "devotional": "The elders of a besieged town have given God five days to save them. Judith, a widow, calls them in and tells them they have no right to put God to the test. Then she makes her own plan."},
            {"title": "Susanna", "readings": ["susanna 1"], "devotional": "Two elders try to force Susanna and, when she refuses, accuse her falsely. She chooses to risk death rather than give in. In Catholic and Orthodox Bibles this story is part of Daniel; it's the young Daniel who exposes the liars."},
            {"title": "Anna's lament", "readings": ["infancy-james 2", "infancy-james 3"], "devotional": "From the Infancy Gospel of James: Anna, later remembered as Mary's mother, grieves her childlessness under a laurel tree, comparing herself to the birds, the animals, the waters, the earth. Her lament echoes Hannah in 1 Samuel 1."},
            {"title": "Mary's song", "readings": ["luke 1"], "devotional": "Two pregnant women meet: Elizabeth and Mary. Then the Magnificat: \"He hath put down the mighty from their seats, and exalted them of low degree\" (1:52). A young woman sings a revolution."},
            {"title": "Crumbs from the table", "readings": ["mark 7"], "devotional": "A Syrophoenician woman asks Jesus to heal her daughter. His answer is harsh. She answers back with wit, and he changes his response \"for this saying\" (7:29). Few people in Mark win an argument with Jesus."},
            {"title": "At the well", "readings": ["john 4"], "devotional": "The longest conversation Jesus has with anyone in John is with an unnamed Samaritan woman. She questions, argues, and then goes and tells her town, \"Come, see.\" Many believe \"for the saying of the woman\" (4:39)."},
            {"title": "She had seen the Lord", "readings": ["john 20"], "devotional": "Mary Magdalene comes to the tomb in the dark, weeps, and is called by name. She is the first to see the risen Jesus in John and is sent to tell the others, \"that she had seen the LORD\" (20:18)."},
            {"title": "The Gospel of Mary", "readings": ["mary 4", "mary 5"], "devotional": "In the Gospel of Mary, after the Savior leaves, Mary comforts the disciples and shares a vision. Andrew doubts her; Peter asks whether the Savior really preferred a woman to them; Levi defends her. The argument ends with them going out to preach. The question it raises has not gone away."},
        ],
    },
    {
        "author": "guides",
        "title": "Romans with Calvin",
        "description": "Sixteen days, one chapter of Romans a day, with John Calvin's commentary on the same chapter. Read Paul first, then see how one of the Reformation's great readers worked through him.",
        "note": "Calvin's commentary is long. You don't have to read all of it — each day's note suggests where to start.",
        "days": [
            {"title": title, "devotional": text, "readings": readings}
            for (title, text), readings in zip(
                _ROMANS_DEVOTIONALS, _paired("romans", ["calvin-romans"], range(1, 17))
            )
        ],
    },
    {
        "author": "guides",
        "title": "Holy Week: Eight Days to Easter",
        "description": "From Palm Sunday to Easter with Mark and John — and, on the last days, the Gospel of Peter, a second-century account of the passion and the only early gospel that describes the resurrection itself.",
        "days": [
            {"title": "Palm Sunday", "readings": ["mark 11"], "devotional": "Jesus enters Jerusalem on a colt, and people spread garments and branches. The next day he curses a fig tree and clears the temple. Mark gives us a king who comes to judge, not to be crowned."},
            {"title": "Questions in the temple", "readings": ["mark 12"], "devotional": "Priests, Pharisees, Herodians, and Sadducees all bring questions designed to trap him. One scribe asks honestly, and Jesus tells him: \"Thou art not far from the kingdom of God\" (12:34)."},
            {"title": "The stones of the temple", "readings": ["mark 13"], "devotional": "Leaving the temple, a disciple admires its stones. Jesus says not one will be left standing. The long speech that follows ends with one command: \"Watch.\""},
            {"title": "Wednesday: the anointing", "readings": ["mark 14"], "devotional": "A woman breaks a jar of ointment over his head; some call it waste. \"Wheresoever this gospel shall be preached... this also that she hath done shall be spoken of for a memorial of her\" (14:9). We still do not know her name."},
            {"title": "Maundy Thursday", "readings": ["john 13", "john 17"], "devotional": "In John, the last supper begins with Jesus washing his disciples' feet: \"I have given you an example\" (13:15). Chapter 17 is his prayer for them — and for \"them also which shall believe on me through their word.\""},
            {"title": "Good Friday", "readings": ["mark 15", "peter 1", "peter 2", "peter 3", "peter 4", "peter 5"], "devotional": "Read Mark's crucifixion, then the Gospel of Peter's. Peter's account blames Herod more than Pilate, and its Jesus is \"silent as if having no pain\" (4:10). At the end he cries, \"My Power, the Power, you've left me!\" (5:19). Compare with Mark 15:34."},
            {"title": "Holy Saturday", "readings": ["peter 6", "peter 7", "peter 8", "psalms 88"], "devotional": "The day between. In the Gospel of Peter, the disciples hide, fasting and weeping (7:26–27), while the authorities seal the tomb with seven seals. Psalm 88 has no answer either. Some days are only waiting."},
            {"title": "Easter", "readings": ["mark 16", "john 20", "peter 9", "peter 10", "peter 11", "peter 12", "peter 13", "peter 14"], "devotional": "Three Easter accounts. Mark's women flee in fear. John's Mary is called by name. And the Gospel of Peter describes what no canonical gospel does: two figures bringing a third out of the tomb, with a cross following, and a voice from heaven asking \"Have you proclaimed to those who sleep?\" (10:41). The fragment breaks off with Peter going back to his nets."},
        ],
    },
    {
        "author": "editors",
        "title": "Angels and Watchers",
        "description": "A week following angels through Genesis, 1 Enoch, Tobit, Daniel, Luke, Jude and Revelation — from the fallen Watchers to Raphael in disguise.",
        "days": [
            {"title": "The sons of God", "readings": ["genesis 6", "enoch 6", "enoch 7"], "devotional": "Genesis gives four verses to \"sons of God\" and \"giants\"; 1 Enoch gives a story with names, an oath, and a mountain. Read them in that order and watch a tradition expand."},
            {"title": "The archangels intercede", "readings": ["enoch 8", "enoch 9", "enoch 10"], "devotional": "Michael, Uriel, Raphael and Gabriel look down at the bloodshed on earth and bring it before God (9:1–3). God sends them to bind the guilty. In 1 Enoch the archangels are the ones who notice the suffering of humanity."},
            {"title": "The seven", "readings": ["enoch 20", "revelation 8"], "devotional": "1 Enoch 20 lists the holy angels \"who watch\" and their tasks. Revelation 8:2 sees \"the seven angels which stood before God.\" Tobit 12:15 knows of seven too. Tomorrow you meet one of them."},
            {"title": "Raphael on the road", "readings": ["tobit 5", "tobit 12"], "devotional": "Tobias needs a guide for a long journey and hires a young man who is in fact the angel Raphael. In chapter 12 he reveals himself: \"I am Raphael, one of the seven holy angels.\" An angel who travels incognito through ordinary family life."},
            {"title": "The prince of Persia", "readings": ["daniel 10", "daniel 12"], "devotional": "Daniel's visitor was delayed twenty-one days by \"the prince of the kingdom of Persia\" until Michael came to help (10:13). Angels here are tied to nations. In chapter 12, Michael stands up, and the dead awake."},
            {"title": "Gabriel", "readings": ["luke 1"], "devotional": "Gabriel appears in Daniel 8–9, and here he appears twice: to Zacharias in the temple and to Mary in Nazareth. Zacharias doubts and is struck silent; Mary asks how, and says yes. Compare the two conversations."},
            {"title": "War in heaven", "readings": ["jude 1", "revelation 12"], "devotional": "Jude mentions angels who \"kept not their first estate\" (1:6), and quotes Enoch (1:14). Revelation 12 shows Michael fighting the dragon, \"that old serpent, called the Devil, and Satan.\" Here the serpent of Genesis and the devil are named as one, and fallen angels are cast down with him (12:9)."},
        ],
    },
    {
        "author": "guides",
        "title": "Genesis 1–7 with Rashi and Calvin",
        "description": "One week, one chapter of Genesis a day, read alongside two classic commentators: Rashi, the great medieval Jewish interpreter, and John Calvin.",
        "note": "Both commentaries are long. Pick one verse that puzzled you and see what each says about it.",
        "days": [
            {"title": title, "devotional": text, "readings": readings}
            for (title, text), readings in zip(
                [
                    ("In the beginning", "Rashi's first comment asks why the Torah, a book of commandments, begins with creation at all instead of with the first commandment. Calvin's first comment rejects reading \"beginning\" as a name for Christ and argues that the world was made out of nothing. Two very different first questions."),
                    ("The garden", "Look at what each commentator says on 2:7 (dust and breath) and 2:18 (\"not good that the man should be alone\"), and compare what each makes of the woman's creation from the man's side."),
                    ("The serpent", "See how each commentator handles the serpent's speech, and what each thinks the couple learned when their eyes were opened."),
                    ("Cain and Abel", "Why was Abel's offering accepted and Cain's not? The text does not say. Commentators have to fill the gap, and you can see each one's assumptions in how he does it."),
                    ("The book of generations", "A genealogy, and Enoch, who \"was not; for God took him.\" Notice how each commentator treats that brief verse — and compare it with the whole book of Enoch on this site."),
                    ("Sons of God", "Genesis 6:2 again. Rashi and Calvin both have views on who the \"sons of God\" were. Neither of them reads it the way 1 Enoch does."),
                    ("The flood", "How long did the flood last? How many animals of each kind? Close readers notice the numbers and repetitions in this chapter; see what Rashi and Calvin do with them."),
                ],
                _paired("genesis", ["rashi-genesis", "calvin-genesis"], range(1, 8)),
            )
        ],
    },
    {
        "author": "guides",
        "title": "The Bible in a Year (66 books)",
        "description": "Genesis to Revelation in 365 days, about three or four chapters a day, in canonical order. The Protestant 66 books.",
        "note": "Missed a day? Don't try to catch up all at once. Pick up from today's reading and keep going.",
        "days": _spread(CANON_66, 365),
    },
    {
        "author": "guides",
        "title": "The Deuterocanon in 30 Days",
        "description": "Tobit, Judith, Wisdom, Sirach, Baruch, Maccabees and more — the books Catholic and Orthodox Christians read as Scripture and many Protestants have never opened. About six chapters a day.",
        "note": "The texts are L. C. L. Brenton's English translation of the Greek. Orthodox churches also read 1 Esdras, 3 Maccabees and the Prayer of Manasseh; 4 Maccabees appears as an appendix in some Greek Bibles.",
        "days": _spread(DEUTEROCANON, 30),
    },
]
