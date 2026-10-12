"""
節・章・書に付ける運営のコメント（英語）。

形は「編集部の問い」をスレッドの頭に置き、その下に違う読み方を返信として並べる。
読み方には頭に名前を付ける（Traditional reading / Skeptical reading / Literary reading /
Ethical question / Reception history）。全体は中立に、個々の読み方は遠慮なく言い切る。
どちらが正しいかで締めない。架空の信仰体験や、一般の利用者を装った書き方はしない。

書の紹介（"ref" が書名だけのもの）は案内係が書く、その書の基本的な情報。
"""

THREADS = [
    # ── 創世記 ──────────────────────────────────────────────────────────────
    {
        "ref": "genesis 1:1",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"In the beginning God created the heaven and the earth." The verse names no witness, no date, and no material God started from. Read it in the KJV, then open the Hebrew (WLC) and the Greek (LXX) with the translation switcher above.

Is this verse a claim about how the universe began, or a claim about who it belongs to?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — The verse is about both, and the second follows from the first. If God made everything, nothing in the world is a rival god: not the sun, not the sea, not the king. Genesis 1 goes on to call the lights in the sky simply "lights" set in place on the fourth day. Origin and ownership are one claim.
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — Look at the shape before the content. Day after day: "And God said... and it was so... and God saw that it was good... and the evening and the morning were." The chapter is built like a liturgy, with a refrain. Whatever it says about physics, it is written to be heard, repeated, and answered. A text that sounds like a hymn should not be graded like a lab report.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — The two readings above are generous, but the verse still makes an enormous claim with no argument at all. It does not prove; it announces. Anyone reading it today is entitled to notice that the text assumes what it asserts, and to ask what kind of authority a sentence like that is asking for.
""",
            },
        ],
    },
    {
        "ref": "genesis 3:1",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

The text calls this character "the serpent" and nothing else. It does not say Satan or devil anywhere in Genesis 3. Later books connect the two (Revelation 12:9 calls the devil "that old serpent").

The serpent says their eyes will be opened and they will know good and evil (3:5). In 3:7 their eyes are opened, and in 3:22 God says the man "is become as one of us, to know good and evil." Part of what the serpent promised comes true inside the story.

So is this a story of temptation and punishment, or a story about what knowledge costs?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — It is temptation, and the half-truth is exactly what makes it temptation. The serpent's promise is true in the way a lie is most effective: they do come to know good and evil, but by grasping instead of receiving, and what they learn first is shame (3:7). The story is not against knowledge. It is against taking what was not given.
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — Notice that the serpent never tells the woman to eat. It asks a question, corrects her, and makes a prediction. The decision is hers, and then his. The story spends its words on seeing ("the tree was pleasant to the eyes"), wanting, taking, giving. It reads less like a trap sprung on helpless people and more like a portrait of how a choice is made.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — God said "in the day that thou eatest thereof thou shalt surely die" (2:17). They eat, and they do not die that day. The serpent's version of events is the one the plot confirms. A reader does not have to like the serpent to admit that, on the text's own terms, it was the more accurate speaker.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — The punishments land unevenly: pain in childbirth and rule by the husband for the woman (3:16), hard labor for the man. For centuries 3:16 was read as a command rather than a consequence. Whatever this story means, it has been used to justify a hierarchy. A reading that ignores that history is not reading the whole text.
""",
            },
        ],
    },
    {
        "ref": "genesis 6:2",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"The sons of God saw the daughters of men that they were fair; and they took them wives of all which they chose." Four verses later comes the flood.

1 Enoch 6–8 tells what looks like the same event at length: two hundred angels swear an oath on Mount Hermon, take wives, father giants, and teach humans metallurgy, cosmetics, and sorcery. Genesis gives it four verses and moves on.

Why would one text say so little and the other so much?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — Genesis 6:1–4 reads like a fragment of a larger story everyone already knew, compressed into a footnote. Enoch reads like someone unpacking that footnote. Reading them together on this site, you can watch a tradition grow: the same names, the same mountain, the same giants, more detail at every step.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — Many Christian interpreters have read "sons of God" in Genesis 6 as the line of Seth rather than angels, precisely because angels marrying humans raises problems the text does not resolve. On that reading Genesis is brief because the event is human, and Enoch's version is an elaboration the church did not need.
""",
            },
            {
                "author": "editors",
                "body": """
Reception history — Not every church agreed that Enoch was unneeded. The Ethiopian Orthodox Tewahedo Church lists 1 Enoch among its Old Testament books, and the Letter of Jude quotes it (Jude 14–15 corresponds to 1 Enoch 1:9). Whether Genesis 6 is a fragment or a whole depends partly on which Bible you were handed.
""",
            },
        ],
    },
    {
        "ref": "genesis 22:2",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"Take now thy son, thine only son Isaac, whom thou lovest." The command piles up three phrases, each narrowing the target, each making it harder.

Chapter 22 begins by telling the reader it is a test (22:1). Abraham is not told. Does knowing it is a test make the story easier to read, or harder?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Easier, and that is the point of telling us. The reader knows from the first line that God will not let Isaac die, so we are free to watch Abraham's trust rather than fear for the boy. Hebrews 11:17–19 reads it this way: Abraham reasoned that God could raise the dead.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — Harder. A test the subject does not know about is still real to the subject. For three days (22:4) Abraham believes he is going to kill his son. Isaac carries the wood for his own sacrifice. Calling this a test settles nothing about whether it was right to demand it, and the story's silence about Sarah and about Isaac afterward is loud.
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — The narrator gives us almost nothing of Abraham's interior. "And they went both of them together" appears twice (22:6, 22:8), with Isaac's only question in between. The restraint is the technique. The text refuses to tell you how to feel, so whatever you feel is yours.
""",
            },
        ],
    },
    {
        "ref": "genesis 50:20",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

Joseph to his brothers, after their father's death: "Ye thought evil against me; but God meant it unto good."

The brothers did sell him. Joseph does not deny it. He holds two intentions in one sentence — theirs and God's — without cancelling either.

Is this forgiveness, or a theology that makes forgiveness unnecessary?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — It is forgiveness that has found its footing. Joseph does not pretend the harm was small. He refuses to put himself "in the place of God" (50:19) as their judge. Seeing a larger purpose is what frees him from needing revenge, and he follows it with a promise to provide for their children (50:21).
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — "God meant it for good" is easy to say from the top of Egypt. It is a dangerous sentence in the mouth of anyone who did the harm, and an unbearable one when said to someone still in the pit. The verse works because the victim says it, after the fact, freely. It should not be borrowed by anyone else.
""",
            },
        ],
    },
    # ── 出エジプト記・申命記 ────────────────────────────────────────────────
    {
        "ref": "exodus 3:14",
        "author": "editors",
        "tags": ["解説"],
        "body": """
Editors' question

Moses asks for God's name and gets "I AM THAT I AM" (KJV). Switch to 口語訳 and you get 「わたしは、有って有る者」; the LXX renders it in Greek with a participle meaning "the one who is."

Three translations, three slightly different answers. Is this a name, a description, or a refusal to give a name?
""",
        "replies": [
            {
                "author": "guides",
                "body": """
A practical note: this verse is a good place to try the side-by-side view. The Hebrew phrase is short and its verb can be read as present or future, which is why some English translations give a footnote such as "I will be what I will be." Every translation here makes a choice, and comparing them shows you the choice.
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — It works as all three. Moses wanted a handle, a name he could use. He receives a sentence that cannot be used as a handle, and then, in the next verse, a name he can use after all (3:15). The text gives and withholds in the same breath.
""",
            },
        ],
    },
    {
        "ref": "deuteronomy 6:4",
        "author": "editors",
        "tags": ["解説"],
        "body": """
Editors' question

"Hear, O Israel: The LORD our God is one LORD." This is the opening of the Shema, still recited in Jewish prayer, and Jesus quotes it in Mark 12:29 when asked for the greatest commandment.

The verse begins with "Hear," not "believe." What changes if the first word of a creed is an instruction to listen?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — The next verses answer: love God with heart, soul, and might, keep these words, teach them to your children, talk of them at home and on the road (6:5–9). The Shema is less a proposition than a practice. Listening is something you do every day, with your household, not a box you tick once.
""",
            },
            {
                "author": "editors",
                "body": """
Reception history — Christians who read this verse and also confess the Trinity have had to explain how both are true, and that explanation took centuries. Jewish readers have long heard the verse as excluding exactly that. The same six Hebrew words sit at the center of two traditions that disagree about what they mean. That is worth sitting with before choosing a side.
""",
            },
        ],
    },
    # ── 詩篇・ヨブ・伝道の書 ────────────────────────────────────────────────
    {
        "ref": "psalms 22:1",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"My God, my God, why hast thou forsaken me?" In Mark 15:34 and Matthew 27:46, Jesus says these words from the cross.

Psalm 22 does not stay in despair; by verse 22 it is praising. Did Jesus mean only the first line, or was he calling up the whole psalm?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Quoting the first line of a psalm was a way of naming the whole psalm, the way you might name a hymn by its first line. On this reading the cry already contains the end of the psalm: "he hath not despised nor abhorred the affliction of the afflicted" (22:24).
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — That reading is comforting, and that is the reason to be careful with it. Mark records only the first line, in Aramaic, and the bystanders misunderstand it (15:35). Mark gives no sign that the hope at the end of the psalm was in view. A cry of abandonment that gets explained away too quickly is no longer a cry.
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — Read the psalm itself and notice the details the Gospels echo: mockers shaking their heads (22:7), "they part my garments among them, and cast lots upon my vesture" (22:18). Whether you think the evangelists saw prophecy fulfilled or shaped their telling around the psalm, the two texts now cannot be read apart.
""",
            },
        ],
    },
    {
        "ref": "psalms 23:4",
        "author": "editors",
        "tags": ["感想"],
        "body": """
Editors' question

"Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me." Notice the pronoun change. Verses 1–3 talk about God ("he maketh me... he leadeth me"). Verse 4 turns and speaks to God: "thou art with me."

Why does the psalm switch from "he" to "you" exactly in the dark valley?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — In green pastures you can describe your shepherd to someone else. In the valley you stop describing and start talking to him. The grammar enacts the nearness the verse claims. Try reading it in 文語訳 too — 「たとひわれ死のかげの谷をあゆむとも」 keeps the same turn.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — The psalm promises presence, not rescue. The speaker still walks through the valley; nothing in the verse removes it. Readers who hear this psalm at funerals know the difference. Whether presence without rescue is enough is a question the psalm does not answer for you.
""",
            },
        ],
    },
    {
        "ref": "psalms 137:9",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

Psalm 137 begins with one of the most beautiful lines in the Bible — "By the rivers of Babylon, there we sat down, yea, we wept" — and ends with this: "Happy shall he be, that taketh and dasheth thy little ones against the stones."

Most lectionaries and hymn settings leave the last verses out. Should they?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Ethical question — The verse blesses the murder of children. No amount of context makes that good. A community that reads it aloud must say plainly that this is a prayer it does not pray, or it risks teaching that rage at enemies can be holy.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — Leaving it out tells exiles and victims that their worst feelings cannot be brought before God. The psalm does not carry out the revenge; it hands it over in words. Scripture here is honest about what suffering does to people, and that honesty is part of why the Psalms have been prayed for so long.
""",
            },
            {
                "author": "editors",
                "body": """
Reception history — Some early Christian readers solved the problem with allegory: the "little ones" of Babylon are small sinful thoughts, to be dashed against the rock, which is Christ, before they grow. It is an ingenious reading, and also evidence of how unbearable the literal sense already was to them.
""",
            },
        ],
    },
    {
        "ref": "job 42:7",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

At the end of Job, God tells Eliphaz: "ye have not spoken of me the thing that is right, as my servant Job hath." The friends spent thirty chapters defending God's justice. Job spent them accusing God of injustice.

How can the accuser be the one who spoke rightly?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Job spoke to God; the friends spoke about God. Job's complaints, however wild, were addressed to someone he trusted was there. The friends turned God into a formula — suffering proves sin — and used it against a suffering man. Honest protest is closer to faith than tidy theology used as a weapon.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — The verse is a quiet bomb under the rest of the Bible's wisdom literature. The friends say things very close to Proverbs: the righteous prosper, the wicked fall. God says they are wrong. If the book's own verdict is that the standard explanation of suffering is false, it offers no replacement — the speeches from the whirlwind ask questions rather than give reasons.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — Then why does the ending restore Job's wealth twice over, and give him new children (42:10–13)? The first children are still dead. A reader can accept the verdict in 42:7 and still find the happy ending troubling — as if replaced children were restored ones.
""",
            },
        ],
    },
    {
        "ref": "ecclesiastes 1:2",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"Vanity of vanities, saith the Preacher; all is vanity." 口語訳: 「空の空、空の空、いっさいは空である」.

Then the book lists what does not change: the earth abides (1:4), the sun rises and sets, the wind goes round, rivers run to the sea (1:5–7). "There is no new thing under the sun" (1:9).

Is endless repetition a sign that life is empty — or that the world is stable?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — The Preacher's list is calm, almost beautiful. Sun, wind, river: no complaint, just observation. The despair is in the human frame around it — "all things are full of labour; man cannot utter it" (1:8). The world is fine. It is people, who want to be remembered and to make something new, for whom it is exhausting.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — It is a sign that life is empty, and the book is braver than its later readers. Verse 11 says no one will be remembered. The book's repeated advice to eat, drink, and enjoy your work (for example 2:24) is not a happy ending. It is what you do once you have accepted that there is no larger meaning on offer.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — The book ends: "Fear God, and keep his commandments" (12:13). Everything "under the sun" is vapor because it is judged from under the sun. The book clears the ground of every false source of meaning so that the only one left is God.
""",
            },
        ],
    },
    # ── 預言書 ──────────────────────────────────────────────────────────────
    {
        "ref": "isaiah 7:14",
        "author": "editors",
        "tags": ["解説"],
        "body": """
Editors' question

"Behold, a virgin shall conceive, and bear a son, and shall call his name Immanuel." Matthew 1:23 quotes this as fulfilled in the birth of Jesus.

This is a verse where translations really differ. The Hebrew word here is usually rendered "young woman" by modern scholars; the Greek LXX, which Matthew quotes, uses a word usually rendered "virgin." Switch between WLC, LXX, KJV and 口語訳 — 口語訳 reads 「おとめ」.

In its own chapter the sign is for King Ahaz, about a crisis in his own day (7:16). Can a prophecy have two fulfillments?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Yes. The sign had a near meaning for Ahaz and a fuller meaning in Christ, and Matthew is reading the whole of Isaiah 7–11, where the promised child grows into "Wonderful, Counsellor, The mighty God" (9:6). Prophecy here is not a prediction that is used up once; it is a pattern God completes.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — In context the child is a timer: before he is old enough to know good from evil, the two kings Ahaz fears will be gone (7:16). That is a sign that only works if it comes soon. Matthew's reading is a Christian reinterpretation of a verse that originally meant something else, and it is fairer to Isaiah to say so.
""",
            },
        ],
    },
    {
        "ref": "isaiah 58:6",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

The people complain: we fasted, and you did not notice (58:3). God answers: "Is not this the fast that I have chosen? to loose the bands of wickedness, to undo the heavy burdens, and to let the oppressed go free?"

Is Isaiah redefining fasting, or rejecting it?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Redefining. The chapter still speaks of a "day for a man to afflict his soul" (58:5) and goes on to honor the sabbath (58:13). The fast is not abolished; it is pointed outward. Hunger that does not lead to feeding the hungry (58:7) has missed its purpose.
""",
            },
            {
                "author": "editors",
                "body": """
Reception history — Compare Matthew 6:16–18, where Jesus assumes his hearers will fast and tells them to do it in secret, and Gospel of Thomas 14, where Jesus says "If you fast, you'll bring guilt upon yourselves." Three texts, three positions on the same practice. All three are on this site; read them in a row.
""",
            },
        ],
    },
    {
        "ref": "jonah 4:11",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

The book of Jonah ends on a question, and nobody answers it: "should not I spare Nineveh, that great city, wherein are more than sixscore thousand persons that cannot discern between their right hand and their left hand; and also much cattle?"

We never hear what Jonah said. Why end the book there?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — Because the question is not for Jonah anymore. It is for the reader, who by now has laughed at the sulking prophet and needs to notice that they may share his anger at undeserved mercy. The open ending turns a story about a prophet into a mirror.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — And "much cattle." The last words of the book include the animals in God's concern. In a book that opens with a storm, a great fish, a plant, and a worm, the non-human world is everywhere. Readers who skip the cattle miss how wide the circle of mercy is drawn.
""",
            },
        ],
    },
    # ── 福音書 ──────────────────────────────────────────────────────────────
    {
        "ref": "matthew 5:39",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"Whosoever shall smite thee on thy right cheek, turn to him the other also."

Is this a rule for individuals, a strategy of resistance, or an impossible ideal meant to show us we cannot keep the law?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — It is a rule for disciples, meant to be kept. The chapter ends "Be ye therefore perfect, even as your Father which is in heaven is perfect" (5:48), and the reason given is God's own way of acting: he sends rain on the just and the unjust (5:45). The command is hard because it describes God.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — Told to a person being abused, this verse has done real harm. "Turn the other cheek" has kept people in violent homes and silenced them before abusers. Whatever the verse means, it cannot mean that the vulnerable must accept violence so the strong are never challenged. Any reading has to answer to that history.
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — Notice "right cheek." A right-handed blow to the right cheek is a backhand — an insult more than an attack. Some readers argue the examples in 5:39–41 are about refusing to accept humiliation on the striker's terms. This reading is debated, but it shows how much the details of a saying can change its force.
""",
            },
        ],
    },
    {
        "ref": "matthew 6:13",
        "author": "guides",
        "tags": ["解説"],
        "body": """
A good verse to try the translation switcher on.

In the KJV the Lord's Prayer ends: "For thine is the kingdom, and the power, and the glory, for ever. Amen." Switch to Nestle 1904 (GRC) and that line is not there — the Greek ends with "deliver us from evil." The TR (GRC), the Greek text behind the KJV, has it.

The closing line is not in the earliest manuscripts of Matthew, and Luke's version of the prayer (Luke 11:2–4) is shorter still. Many churches still pray the longer ending; it is old and widely used, and an early Christian handbook called the Didache already has a similar doxology. Neither form is a mistake. They are two stages of how the prayer was prayed.
""",
    },
    {
        "ref": "mark 16:8",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"And they went out quickly, and fled from the sepulchre; for they trembled and were amazed: neither said they any thing to any man; for they were afraid."

In Nestle 1904 (GRC), verses 9–20 are printed inside double brackets, marking them as an addition. The oldest complete manuscripts of Mark end here, at verse 8, with frightened women and no appearance of the risen Jesus.

Could a Gospel really end with "for they were afraid"?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — Yes, and it may be the most powerful ending of the four. Mark's Gospel is full of people who misunderstand and fail. The women are told to go and tell (16:7) and instead say nothing. The reader knows the message got out — otherwise there would be no Gospel to read — and is left holding the unfinished command.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — Or the original ending was lost: a damaged last page, an unfinished scroll. The fact that several different endings were written later (the longer ending in the KJV, and a shorter one in some manuscripts) shows that early readers also felt something was missing. Elegance is not evidence.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — The longer ending, 16:9–20, has been read in churches for most of Christian history and is accepted as canonical by many traditions whatever its origin. Whether Mark wrote it or not, the church received it. Its contents also echo the other Gospels and Acts.
""",
            },
        ],
    },
    {
        "ref": "luke 10:29",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

The lawyer asks, "And who is my neighbour?" Jesus tells the parable of the Samaritan and then asks a different question: "Which now of these three, thinkest thou, was neighbour unto him that fell among the thieves?" (10:36).

The lawyer asked who counts as a neighbor. Jesus asked who acted as one. Did Jesus answer the question, or replace it?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — He replaced it, and that is the answer. The lawyer wanted a boundary: who is inside the circle I must love. Jesus refuses to draw it and asks him to become the neighbor instead. "Go, and do thou likewise" (10:37).
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — The hero is a Samaritan, the kind of person the lawyer would not have chosen as a model. The lawyer cannot even bring himself to say the word: "He that shewed mercy on him" (10:37). The parable works by making the listener admire the person they look down on.
""",
            },
        ],
    },
    {
        "ref": "luke 15:28",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

The parable of the prodigal son is really about two sons. The younger comes home and gets a feast. The elder "was angry, and would not go in."

The story ends with the father pleading and the elder son still outside. We are never told if he went in. Whose story is this?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — Look at who Jesus is talking to: "the Pharisees and scribes murmured, saying, This man receiveth sinners, and eateth with them" (15:2). Three parables later, the story ends with a righteous son murmuring at a meal for a sinner. The elder brother is the audience, and the open door is for them.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — The elder son has a point. "Lo, these many years do I serve thee... and yet thou never gavest me a kid" (15:29). Faithfulness that is never celebrated is a real wound. The father's answer — "all that I have is thine" (15:31) — is generous, but it does not pretend the complaint is foolish.
""",
            },
        ],
    },
    {
        "ref": "john 1:1",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"In the beginning was the Word." Matthew begins with a genealogy, Luke with a dedication and a priest in the temple, Mark with John the Baptist. John begins before creation.

"In the beginning" deliberately echoes Genesis 1:1 — in Greek the opening words are the same as in the LXX of Genesis. Why would a Gospel about a man from Nazareth start with the first words of the Bible?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Because the man from Nazareth is the one through whom the beginning happened: "All things were made by him" (1:3). The prologue tells you who Jesus is before you meet him, so that every scene after it — the wedding, the well, the tomb of Lazarus — is read as God acting in person.
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — It turns a biography into a new Genesis. Light and darkness come back (1:5), and the Gospel ends with Jesus breathing on his disciples (20:22), as God breathed into Adam (Genesis 2:7). The whole book is framed as creation starting over.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — The prologue is a confession, not a report. No witness was there "in the beginning." Readers who do not share the confession can still learn from John, but they should notice that the Gospel tells them in the first verse what conclusion they are meant to reach (compare 20:31).
""",
            },
        ],
    },
    {
        "ref": "john 8:7",
        "author": "editors",
        "tags": ["解説"],
        "body": """
Editors' question

"He that is without sin among you, let him first cast a stone at her."

This story (John 7:53–8:11) is beloved, and it is also one of the clearest examples of a passage that is not in the oldest manuscripts of John. Many modern Bibles put it in brackets; in some manuscripts it appears in another place, even in Luke.

If a story may not have been part of the original Gospel, but may still remember something true about Jesus, how should a reader treat it?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Treat it as Scripture. The church has read it for well over a thousand years, and its picture of Jesus — merciful and morally serious ("go, and sin no more") — fits every other Gospel. The question of where the text came from is real; the question of whether to read it is settled by the church's long use.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — Treat it as what the evidence says it is: a story that circulated separately and was later inserted. That does not make it worthless. It makes it a different kind of text — early tradition, not John. Reading it honestly means knowing that difference, which is why this site lets you compare editions side by side.
""",
            },
        ],
    },
    {
        "ref": "john 20:17",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"Touch me not; for I am not yet ascended to my Father." Mary Magdalene is the first to see the risen Jesus in John, and the first to be sent with the news: "go to my brethren" (20:17–18).

In the Gospel of Mary (also on this site), Peter asks whether the Savior really spoke privately with a woman and preferred her to them. Why does the question of Mary's authority keep coming back in early Christian writing?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Reception history — Because the canonical Gospels themselves make her the first witness of the resurrection (Matthew 28, Mark 16:9 in the longer ending, John 20). Later writers had to do something with that fact. The Gospel of Mary develops it into a story about her teaching; much later Western tradition merged her with other women and remembered her as a repentant sinner, which none of the Gospels say.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — Eastern Christian tradition calls her "equal to the apostles," precisely because of John 20:18. Her authority is not a modern discovery or a suppressed secret. It is in the canon, read every Easter.
""",
            },
        ],
    },
    # ── 書簡・黙示録 ────────────────────────────────────────────────────────
    {
        "ref": "romans 7:19",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"For the good that I would I do not: but the evil which I would not, that do I."

Who is the "I" in Romans 7? Paul before he believed, Paul as a believer, or a figure standing for humanity — or for Israel under the law?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Many Protestant readers, following Augustine's later view and Luther, have heard the mature believer here: the closer you come to God, the more clearly you see your divided will. The chapter ends not in despair but in thanks (7:25), and chapter 8 follows.
""",
            },
            {
                "author": "editors",
                "body": """
Literary reading — Paul shifts from past tense (7:7–13) to present tense (7:14–25). That shift is the evidence every interpretation has to explain. Other readers take the "I" as a speech-in-character, a voice Paul performs for rhetorical effect. The verse is a famous description of inner conflict whoever is speaking.
""",
            },
        ],
    },
    {
        "ref": "1-corinthians 13:12",
        "author": "editors",
        "tags": ["感想"],
        "body": """
Editors' question

"For now we see through a glass, darkly; but then face to face: now I know in part; but then shall I know even as also I am known."

The chapter about love ends with a sentence about knowledge. Why does Paul put them together?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — Because the Corinthians were proud of their knowledge. Chapter 8 already warned "knowledge puffeth up, but charity edifieth" (8:1). In chapter 13, knowledge and prophecy "shall vanish away" (13:8). Love outlasts them, because love is how you are known, not just how you know.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — "Darkly" is an honest word in the middle of a hymn. Paul admits that what he knows now is partial and blurred — including, presumably, what he is saying. A reader who quotes this chapter as certainty has skipped the verse where its author admits his limits.
""",
            },
        ],
    },
    {
        "ref": "1-john 5:7",
        "author": "guides",
        "tags": ["解説"],
        "body": """
This is the most famous textual difference in the New Testament, and a good place to see why this site shows several editions.

KJV: "For there are three that bear record in heaven, the Father, the Word, and the Holy Ghost: and these three are one." The TR (GRC) has the same words in Greek.

口語訳: 「あかしをするものが、三つある。」 — the heavenly witnesses are not there, because they are not in the Greek manuscripts translators now rely on. The extra words (often called the "Johannine Comma") appear in late manuscripts and in some Latin ones, and entered printed Greek New Testaments in the 1500s.

Open the verse, then use the translation switcher to read it both ways.
""",
    },
    {
        "ref": "james 2:24",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

"Ye see then how that by works a man is justified, and not by faith only."

Romans 3:28: "a man is justified by faith without the deeds of the law." Both cite Abraham (Romans 4, James 2:21–23).

Are Paul and James contradicting each other, or using the same words for different things?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Different things. Paul's "works of the law" are what Jews and Gentiles might rely on to be accepted by God; James's "works" are the mercy that living faith produces — feeding the hungry, clothing the naked (2:15–16). Paul fights earning; James fights empty belief. "Faith which worketh by love" (Galatians 5:6) is where they meet.
""",
            },
            {
                "author": "editors",
                "body": """
Reception history — Not everyone was satisfied by that harmony. Luther in his 1522 preface called James "an epistle of straw" compared with the books he held to be the heart of the New Testament. The canon holds both letters side by side; it does not tell you how to make them agree.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — If you have to redefine "faith," "works," and "justified" to make two sentences agree, maybe they disagreed. Early Christianity was a set of arguing communities, and the New Testament preserves some of the argument. That is not a scandal. It is history.
""",
            },
        ],
    },
    {
        "ref": "jude 1:14",
        "author": "editors",
        "tags": ["解説"],
        "body": """
Editors' question

"And Enoch also, the seventh from Adam, prophesied of these, saying, Behold, the Lord cometh with ten thousands of his saints." This is a quotation from 1 Enoch 1:9. Open Enoch 1 on this site and compare.

A New Testament letter quotes a book that most churches did not put in their Bible. What does that tell us?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Reception history — It tells us 1 Enoch was read and respected by at least some early Christians. Jude calls it prophecy. Later writers took different paths: some took Jude's quotation as a reason to value Enoch; others questioned Jude because of the quotation. Only the Ethiopian Orthodox Tewahedo Church kept Enoch in its Old Testament.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — Quoting a book is not the same as declaring it Scripture. Paul quotes Greek poets (Acts 17:28, Titus 1:12). Jude can recognize a true prophecy in Enoch without endorsing the whole book. The verse shows the early church's world was wider than its canon.
""",
            },
        ],
    },
    {
        "ref": "revelation 21:4",
        "author": "editors",
        "tags": ["感想"],
        "body": """
Editors' question

"And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain."

Revelation spends twenty chapters on war, plague, and judgment, and ends with this. Does the ending redeem the violence that came before it, or sit uneasily beside it?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — The ending is the point of the whole book. Revelation was written to people under pressure, and the violence is the destruction of what destroys: Babylon, the beast, death itself (20:14). The tears are wiped by God's own hand. A book that took suffering less seriously could not end with comfort this personal.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — The new Jerusalem has no tears for those inside it. Outside, according to 21:8, is the lake of fire. A vision of comfort built on the eternal exclusion of others is something many readers cannot simply celebrate, and they should not be told their discomfort is a failure of faith.
""",
            },
        ],
    },
    # ── 第二正典・外典・偽書 ────────────────────────────────────────────────
    {
        "ref": "enoch 6:3",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

Semjaza, the leader of the angels, hesitates: "I fear ye will not indeed agree to do this deed, and I alone shall have to pay the penalty of a great sin." So the two hundred swear an oath together (6:4–5).

Then come giants, violence, and forbidden knowledge (chapters 7–8). The text spreads responsibility across the angels, their children, and the humans who learned their arts. Who is to blame for the corruption of the earth?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — The oath is the key image. Semjaza does not want to be alone in guilt, so he makes guilt collective. The story is about how groups make evil possible that no single member would dare. That idea did not need angels to be true.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — Look at what is taught in 8:1: weapons, but also bracelets, ornaments, cosmetics, dyes. Putting swords and eye makeup in one list of corrupting knowledge says something about how this text sees women and beauty. A modern reader can take the story seriously and still question that list.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — Humans are not let off. "They were led astray, and became corrupt in all their ways" (8:2): being taught evil does not mean you were forced to do it. The earth itself brings the accusation (7:6), and the cry goes up to heaven (8:4). Judgment comes, and it begins with the ones who knew better.
""",
            },
        ],
    },
    {
        "ref": "thomas 3:1",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

Gospel of Thomas, saying 3: "If your leaders tell you, 'Look, the kingdom is in heaven,' then the birds of heaven will precede you... Rather, the kingdom is within you and outside of you."

Compare Luke 17:21 (KJV): "the kingdom of God is within you" — which many modern translations render "among you."

Is the kingdom an inner state, a community, or something still to come?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — Thomas mocks the idea of a kingdom you can point to: if it were in the sky, the birds would get there first. The joke makes its point. The kingdom is found by knowing yourself (3:2), not by looking somewhere else. It is an inward, searching kind of faith.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — In the canonical Gospels the kingdom is near and arriving — "Thy kingdom come" — and it comes with judgment and resurrection. Thomas keeps the "within" and drops the "coming." That is precisely why most early churches did not read Thomas in worship: it keeps the sayings and loses the story.
""",
            },
            {
                "author": "editors",
                "body": """
Skeptical reading — "Within you and outside of you" is not a retreat into the self. It refuses both a purely future kingdom and a purely private one. Thomas may be closer to some early sayings traditions than its critics allow; many of its sayings have parallels in Matthew and Luke. It deserves to be read on its own terms, not only as a foil.
""",
            },
        ],
    },
    {
        "ref": "wisdom 2:23",
        "author": "editors",
        "tags": ["解説"],
        "body": """
Editors' question

The Wisdom of Solomon: God made humans to be immortal, an image of his own eternity; "nevertheless through envy of the devil came death into the world" (2:23–24).

Genesis 3 never names the devil. Here, a book read as Scripture by Catholic and Orthodox Christians makes a connection Genesis leaves open. Is this interpretation, or revelation?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Reception history — It is one of the early steps on the road from "the serpent" to "Satan." Wisdom is in the Greek Old Testament used by early Christians, and Catholic and Orthodox Bibles include it. Protestant Bibles place it among the Apocrypha, or leave it out. Where you were raised often decides whether this verse is Scripture or background.
""",
            },
            {
                "author": "editors",
                "body": """
Traditional reading — Both. Later Scripture interpreting earlier Scripture is itself part of revelation; the New Testament does the same with Revelation 12:9. Wisdom does not contradict Genesis. It names what Genesis shows.
""",
            },
        ],
    },
    {
        "ref": "tobit 12:15",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

Raphael finally reveals himself: "I am Raphael, one of the seven holy angels." For eleven chapters he traveled with Tobias in disguise, under the name Azarias.

Why tell a story where an angel is present the whole time and no one knows?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Literary reading — Because the book is about ordinary faithfulness: burying the dead, giving alms, marrying well, caring for an old blind father. The angel walks inside that ordinary life without interrupting it. Heaven does not replace the household; it accompanies it.
""",
            },
            {
                "author": "editors",
                "body": """
Reception history — Tobit is in Catholic and Orthodox Bibles and in the Apocrypha of older Protestant Bibles, including the original 1611 KJV. Raphael's name as an archangel comes largely from this book; he is the only one named among the seven, and the idea of seven angels before God also appears in 1 Enoch 20 and Revelation 8:2.
""",
            },
        ],
    },
    {
        "ref": "2-maccabees 7:9",
        "author": "editors",
        "tags": ["考察"],
        "body": """
Editors' question

A mother and her seven sons are tortured for refusing to eat pork. The second son, dying, tells the king that the King of the world will raise up those who die for his laws "unto everlasting life."

This is one of the clearest statements of bodily resurrection in the Jewish scriptures. Why does belief in resurrection appear so strongly in a story about martyrdom?
""",
        "replies": [
            {
                "author": "editors",
                "body": """
Traditional reading — Because martyrdom forces the question of justice. If the faithful die for keeping God's law and the tyrant lives, then either God is unjust or the story is not over. Resurrection is God's answer to the death of the righteous, as in Daniel 12:2.
""",
            },
            {
                "author": "editors",
                "body": """
Ethical question — The mother urges her youngest son to die rather than obey (7:27–29). The book praises her. Readers today may admire her courage and still feel the weight of a story that holds up the deaths of children as a model. Martyr stories are powerful, and that is exactly why they need careful reading.
""",
            },
        ],
    },
    # ── 書の紹介（案内係） ──────────────────────────────────────────────────
    {
        "ref": "enoch",
        "author": "guides",
        "tags": ["解説"],
        "body": """
About this book

1 Enoch is a collection of writings attributed to Enoch, the man who "walked with God" in Genesis 5:24. It survives complete in Ge'ez (classical Ethiopic); fragments in Aramaic were found among the Dead Sea Scrolls. The Ethiopian Orthodox Tewahedo Church counts it among its Old Testament books, and the Letter of Jude quotes it (Jude 14–15 = 1 Enoch 1:9).

The text here is R. H. Charles's English translation. Scholars usually divide the book into five parts: the Book of the Watchers (ch. 1–36), the Parables or Similitudes (37–71), the Astronomical Book (72–82), the Dream Visions (83–90), and the Epistle of Enoch (91–108).

Good places to start: chapter 1 (the opening vision), chapters 6–8 (the Watchers), and chapter 14 (Enoch's ascent to the heavenly house).
""",
    },
    {
        "ref": "thomas",
        "author": "guides",
        "tags": ["解説"],
        "body": """
About this book

The Gospel of Thomas is a collection of 114 sayings attributed to Jesus, with almost no narrative: no birth, no miracles, no crucifixion or resurrection. A complete copy in Coptic was found near Nag Hammadi in Egypt in 1945. Greek fragments had already been found at Oxyrhynchus.

About half of the sayings have parallels in Matthew, Mark, and Luke; others are unknown elsewhere. Scholars disagree about its date and about how it relates to the canonical Gospels.

On this site each saying is its own chapter, so "Thomas 3" means saying 3. Chapter 0 is the prologue. The English translation is by Mark M. Mattison (public domain).
""",
    },
    {
        "ref": "mary",
        "author": "guides",
        "tags": ["解説"],
        "body": """
About this book

The Gospel of Mary survives in one Coptic copy (the Berlin Codex) and two small Greek fragments. It is incomplete: the first six pages and four pages in the middle are missing, so the text begins partway through a conversation between the risen Savior and his disciples.

The second half centers on Mary Magdalene, who tells the disciples about a vision the Savior gave her. Andrew and Peter challenge her; Levi defends her.

On this site, chapters follow the section headings of the translation and verse numbers follow the manuscript's page numbers — so gaps in the numbering are real gaps in the manuscript. Translation by Mark M. Mattison (public domain).
""",
    },
    {
        "ref": "judas",
        "author": "guides",
        "tags": ["解説"],
        "body": """
About this book

The Gospel of Judas is known from a single damaged Coptic manuscript, the Codex Tchacos, which was published in 2006. Irenaeus, writing around 180 AD, already mentions a "Gospel of Judas" used by a group he opposed.

The text presents conversations between Jesus and Judas in the days before the Passover. How it portrays Judas — as a hero, or as a tragic figure set apart for a dark role — has been debated since its publication, partly because of damaged passages and disputed translations.

Verse numbers on this site follow the manuscript pages. Translation by Mark M. Mattison (public domain).
""",
    },
    {
        "ref": "wisdom",
        "author": "guides",
        "tags": ["解説"],
        "body": """
About this book

The Wisdom of Solomon was written in Greek, probably in Alexandria, in the last centuries BC or around the turn of the era. It speaks in Solomon's voice, but it was not written by the historical Solomon.

It is in the Catholic and Orthodox Old Testaments and among the Apocrypha in Protestant tradition. Its themes include immortality, the suffering of the righteous (chapters 2–5), and Wisdom as a figure close to God (chapters 7–9).

The text here is L. C. L. Brenton's English translation of the Septuagint.
""",
    },
    {
        "ref": "peter",
        "author": "guides",
        "tags": ["解説"],
        "body": """
About this book

The Gospel of Peter survives as a fragment found in a grave at Akhmim, Egypt, in the 1880s. What remains begins at Jesus' trial and runs through the crucifixion to the discovery of the empty tomb.

It is narrated in Peter's voice. Its most famous scene describes the resurrection itself — something none of the canonical Gospels narrate directly. Eusebius records that Serapion, a bishop around 200 AD, first allowed it to be read and then objected to it.

Translation by Mark M. Mattison (public domain).
""",
    },
    {
        "ref": "sirach",
        "author": "guides",
        "tags": ["解説"],
        "body": """
About this book

Sirach (also called Ecclesiasticus, or the Wisdom of Ben Sira) is a book of practical wisdom written in Hebrew in the early second century BC and translated into Greek by the author's grandson, who explains this in a prologue.

It covers friendship, money, speech, family, illness, and work, and ends with a long praise of famous ancestors (chapters 44–50). It is in the Catholic and Orthodox Old Testaments and among the Protestant Apocrypha.

The text here is L. C. L. Brenton's translation of the Greek.
""",
    },
    {
        "ref": "infancy-james",
        "author": "guides",
        "tags": ["解説"],
        "body": """
About this book

The Infancy Gospel of James (often called the Protevangelium of James) tells the story of Mary's own birth to Joachim and Anna, her childhood in the temple, her betrothal to Joseph, and the birth of Jesus.

It was never part of the canon, but it has been enormously influential: much of what Christians remember about Mary's parents and childhood, and several church feasts, draw on it.

Translation by Mark M. Mattison (public domain).
""",
    },
    {
        "ref": "genesis 1",
        "author": "guides",
        "tags": ["解説"],
        "body": """
Reading tip for this chapter: Genesis 1 is available here in five editions — KJV, 口語訳, 文語訳, the Hebrew WLC, and the Greek LXX. If you do not read Hebrew or Greek, you can still open them side by side and watch the repeated refrains line up: "and God said," "and it was so," "and God saw that it was good." The structure is visible even when the words are not.
""",
    },
    {
        "ref": "mark 1",
        "author": "guides",
        "tags": ["解説"],
        "body": """
Reading tip: Mark is the shortest Gospel and many scholars think it is the earliest. It moves fast — the word often translated "straightway" or "immediately" appears again and again in this first chapter. Try reading the whole Gospel in one sitting; it takes about an hour and a half, and you feel its urgency in a way you never do reading a chapter at a time.
""",
    },
]
