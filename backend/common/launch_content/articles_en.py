"""
記事（英語）。前半はサイトの案内と、正典・外典をまたいで読む記事。

本文の書式（ArticleBody.tsx が表示できるもの）:
    ## 見出し / ### 小見出し / - 箇条書き / 1. 番号付き / > 引用 / **太字** / *斜体* / [文字](URL)
    [[john 1:1]]  文中の参照（リンクになる）
    {{john 1:1-3|KJV}}  引用ブロック（節の本文が出る）。英語の記事は KJV を指定して英語で出す
    [[@calvin-romans 8:1]]  解釈書の参照

tags は ArticleTag の slug（articles/models.py の INITIAL_TAGS）。1 記事 3 つまで。
"""

from .articles_en_more import ARTICLES as MORE_ARTICLES

ARTICLES = [
    {
        "author": "official",
        "title": "Welcome to NeON Church: How to Read Here",
        "summary": "What this site is, what you can do on it, and a few places to start — for readers with or without faith.",
        "tags": [],
        "body": """
NeON Church is a library and a conversation. The library holds the Bible in several editions — English, Japanese, Hebrew and Greek — along with the deuterocanonical books and early Christian writings that most Bibles leave out: 1 Enoch, the Gospel of Thomas, the Gospel of Mary, the Gospel of Peter, and more. The conversation happens on the page: on a verse, a chapter, or a whole book.

You can read everything without an account. You need one only to post.

## What you can do

- **Read.** Pick a book from the list. Every book shows the editions we have; switch between them with the translation menu. Many readers keep the KJV open and glance at the Greek or Hebrew to see where translations differ.
- **Comment.** Tap a verse to see what others have said about it, or to start a thread. Chapters and books have their own discussions too.
- **Ask.** The Q&A is for questions that have answers — or at least better and worse ones. Mark the most helpful answer when your question is resolved.
- **Follow a plan.** Reading plans give you a chapter or a few each day, sometimes with a short note. Some cross the boundaries between canon and non-canon on purpose.
- **Write.** Articles, like this one, can quote passages directly. Insert a reference from the citation panel and it becomes a link; insert a quotation and the passage's text appears in the article.
- **Translate.** Some texts here exist only in English. Translation projects let people work together, verse by verse, to bring them into other languages.

## Three places to start

If you have never read the Bible, start with Mark. It is the shortest Gospel and moves fast; it begins like this:

{{mark 1:1-3|KJV}}

If you know the Bible well, open a book you have never read. Try 1 Enoch, whose first chapter is quoted in the New Testament ([[jude 1:14-15]]), or the Gospel of Thomas, which is nothing but sayings.

If you want to see what this site does differently, open [[matthew 6:13]] and switch between the KJV and the Greek. The last line of the Lord's Prayer is there in one and missing in the other. Every edition is a decision someone made.

## About the posts from NeON Church

You will see posts from three accounts: **NeONChurch**, **NeONChurch_Editors**, and **NeONChurch_Guides**. They are written by the people who run the site, with help from AI, and checked against the texts here. They are there so that you do not arrive at an empty room.

The editors' posts on a verse usually start with a question and then set out different readings — traditional, skeptical, literary, ethical — each stated as strongly as we can. We do not tell you which one is right. If one of them is wrong about a fact, please reply and say so, or report it.

## How we talk here

Disagree with readings, not with people. A believer explaining why a verse matters to them and a historian explaining why they doubt its date are both doing what this site is for. The full community guidelines are linked at the bottom of every page.

Welcome. Pull a book off the shelf.
""",
    },
    {
        "author": "official",
        "title": "Why Enoch Sits Next to Genesis: On Canons, Plural",
        "summary": "Christians have never agreed on a single list of books. Here is why NeON Church puts them all on one shelf, and how we label them.",
        "tags": [],
        "body": """
Open the book list on this site and you will find Genesis and 1 Enoch, John and the Gospel of Thomas, Romans and the Wisdom of Solomon, all on the same shelf. Some visitors find that exciting; some find it worrying. This article explains what we are doing and what we are not.

## There is no single Bible

"The Bible" sounds like one book with one table of contents. It isn't, and it never has been.

- Most **Protestant** Bibles have 66 books.
- **Catholic** Bibles have 73, adding Tobit, Judith, Wisdom, Sirach, Baruch, and 1–2 Maccabees, and longer versions of Esther and Daniel.
- **Orthodox** Bibles include those and more, such as 1 Esdras, 3 Maccabees, and the Prayer of Manasseh.
- The **Ethiopian Orthodox Tewahedo Church** lists 81 books, and its Old Testament includes 1 Enoch and Jubilees.

The New Testament has its own history. A list matching the 27 books most churches now accept appears in a letter by Athanasius of Alexandria in 367 AD — more than three centuries after Jesus. The traditional Syriac Bible, the Peshitta, long went without 2 Peter, 2 and 3 John, Jude, and Revelation. Martin Luther moved Hebrews, James, Jude and Revelation to the end of his New Testament because he doubted them. And the 1611 King James Bible printed the Apocrypha between the Testaments.

So when a reader asks, "Is Enoch in the Bible?", the honest answer is, "In whose?"

## The New Testament reads beyond the canon

The boundary was porous even inside the books everyone accepts. The Letter of Jude quotes Enoch by name:

{{jude 1:14-15|KJV}}

That is 1 Enoch 1:9, which you can read for yourself:

{{enoch 1:9}}

Paul quotes Greek poets ([[acts 17:28]]). Hebrews 11 alludes to martyr stories that resemble 2 Maccabees ([[hebrews 11:35]]). Reading the early Christian world only through its eventual canon means missing some of the voices its writers were listening to.

## What we do

We put the texts side by side and let you read each one in its own words. We do not rank them with labels like "true" and "false," or "canon" and "heresy." Our guides are posting short introductions in the discussion of each book — starting with the less familiar ones — that say where it comes from, how old it is, and which communities read it as Scripture.

## What we don't do

We do not claim that every text is equally old, equally reliable as history, or equally holy. The Gospel of Mark and the Infancy Gospel of Thomas are not the same kind of text, and we say so. We also do not claim that the churches were wrong to choose as they did. Their choices are part of the story, and we try to show them clearly.

What we believe is simpler: you can only judge a book you have read. NeON Church exists so that you can read them.

## Where to go from here

- Read [[genesis 6:1-4]], then [[enoch 6]], and decide what you think the relationship is.
- Read [[thomas 3]] next to [[luke 17:20-21]].
- Try the plan "The Deuterocanon in 30 Days" if you have never read Tobit or Sirach.
""",
    },
    {
        "author": "editors",
        "title": "Who Is the Serpent? Genesis 3 Before and After Revelation 12",
        "summary": "Genesis never calls the serpent Satan. Follow how later texts — Wisdom, Revelation, and the Life of Adam and Eve — made the connection.",
        "tags": ["sin", "angels-and-demons"],
        "body": """
Ask almost anyone who tempted Eve, and they will say "Satan." Read Genesis 3, and you will not find that name.

{{genesis 3:1|KJV}}

The serpent is "more subtil than any beast of the field which the LORD God had made." It is a creature, compared to other creatures. At the end of the scene it is cursed to crawl and eat dust ([[genesis 3:14]]) — a punishment that fits an animal. Nothing in the chapter says it is anything more.

## How the serpent became the devil

The identification grew over centuries, and you can trace some of its steps on this site.

### The Wisdom of Solomon

Written in Greek, probably in the last century or so before Jesus, Wisdom says:

{{wisdom 2:23-24}}

It does not mention the serpent, but it puts the devil at the scene of humanity's fall into death. A reader of Genesis who also read Wisdom would naturally connect them.

### Revelation

The New Testament's last book makes the link explicit:

{{revelation 12:9|KJV}}

"That old serpent" — the serpent of the old story. Here, at last, the serpent and Satan are named as one.

### The Life of Adam and Eve

Among the books on this site is the *Life of Adam and Eve*, a retelling of the story after the expulsion from Eden. It goes further still: the devil tells Adam that he was cast out of heaven because of him, after refusing to worship the newly made image of God ([[adam-and-eve 12:1-3]], [[adam-and-eve 14:1-3]]). It shows how vividly later readers imagined what Genesis leaves unsaid.

## Why it matters how you read it

If the serpent is Satan, Genesis 3 is a story about a cosmic enemy who deceives humanity. If the serpent is a clever animal, it is a story about a choice humans made, with no one else to blame. Both readings have deep roots.

The first reading has the weight of most Christian tradition, and of Revelation itself. The second is closer to what the text of Genesis actually says. Notice too that in Genesis, when God questions the humans, the man blames the woman and the woman blames the serpent ([[genesis 3:12-13]]). The serpent is not asked. A story that ends with everyone shifting blame may be warning its readers not to do the same.

## A detail worth noticing

The serpent's predictions come partly true. It says their eyes will be opened and they will know good and evil ([[genesis 3:5]]). Their eyes are opened ([[genesis 3:7]]), and God says the man has become "as one of us, to know good and evil" ([[genesis 3:22]]). Whatever the serpent is, it is not simply a liar. That is what makes it dangerous — and what makes the story worth reading again.

Join the discussion on [[genesis 3:1]] — the editors have posted several readings there.
""",
    },
    {
        "author": "editors",
        "title": "The Watchers: Reading 1 Enoch 6–11 Next to Genesis 6",
        "summary": "Four verses in Genesis, six chapters in Enoch. What the Book of the Watchers adds to the story of the sons of God, and why it mattered to early readers.",
        "tags": ["angels-and-demons", "sin"],
        "body": """
Genesis 6 opens with four of the strangest verses in the Bible:

{{genesis 6:1-4|KJV}}

Then, almost at once, the flood story begins. Who were the "sons of God"? Who were the giants? Genesis does not say.

1 Enoch does — at length.

## The oath on Mount Hermon

The Book of the Watchers (1 Enoch 1–36) retells the moment as a conspiracy:

{{enoch 6:1-3}}

Two hundred angels swear an oath together and descend on Mount Hermon ([[enoch 6:4-6]]). Their leader, Semjaza, is afraid of bearing the guilt alone, so he makes it collective. Their children are giants, who devour first the labor of humans and then humans themselves ([[enoch 7:2-5]]).

## The knowledge that corrupts

Enoch adds something Genesis never mentions: the Watchers teach. Azazel teaches weapons and metalwork, and also ornaments, cosmetics, and dyes:

{{enoch 8:1-2}}

Other angels teach enchantments, astrology, and the signs of the sky ([[enoch 8:3]]). In this telling, violence and corruption spread not only through the giants but through knowledge put into human hands too soon.

## The earth cries out

The most moving moment may be this one:

{{enoch 8:4}}

In chapter 9 four archangels — Michael, Uriel, Raphael and Gabriel — look down, see the blood, and bring the earth's cry before God ([[enoch 9:1-3]]). God sends them to act: Raphael binds Azazel, Gabriel turns the giants against each other, Michael binds Semjaza, and Noah is warned of the flood ([[enoch 10:1-12]]). Chapters 10–11 also look beyond the flood to a cleansed earth, where "truth and peace shall be associated together" ([[enoch 11:2]]).

## Reading them together

There are at least three ways to read the two texts side by side.

1. **Enoch as expansion.** Genesis compresses a story everyone knew; Enoch tells it in full. This is how many ancient readers seem to have taken it — Jude quotes Enoch ([[jude 1:14]]) and mentions angels who "kept not their first estate" ([[jude 1:6]]).
2. **Enoch as interpretation.** Enoch is a later attempt to explain a puzzling passage, as every commentary is. It tells us how some Jews of the Second Temple period read Genesis, not what Genesis meant.
3. **Two independent traditions.** Both draw on older stories about divine beings and giants, and each shapes them for its own purposes.

Whichever you choose, notice what Enoch adds to the question of responsibility. In Genesis 6, God sees that "the wickedness of man was great" ([[genesis 6:5]]). In Enoch, heaven carries much of the blame. That shift — from human evil to cosmic rebellion — would echo through Jewish and Christian thought for centuries.

## Try it yourself

The plan "Beginnings: Genesis 1–11 with the Book of the Watchers" reads Genesis 6 and Enoch 6–11 on consecutive days. The verse [[enoch 6:3]] has a thread from the editors on the question of who is to blame.
""",
    },
    {
        "author": "editors",
        "title": "Fasting in Three Voices: Isaiah 58, Matthew 6, and Thomas 14",
        "summary": "Isaiah redefines fasting, Jesus in Matthew tells you to do it in secret, and Jesus in Thomas says it will bring guilt. Three texts, one practice.",
        "tags": ["fasting", "prayer"],
        "body": """
Few practices show how differently ancient texts can speak as clearly as fasting. Here are three voices, from three very different books.

## Isaiah: the fast God chooses

The people complain that God ignores their fasting. God answers that their fasting ignores their neighbors:

{{isaiah 58:3-4|KJV}}

And then:

{{isaiah 58:6-7|KJV}}

Isaiah does not abolish fasting. He points it outward. A fast that leaves the hungry hungry has missed its own purpose.

## Matthew: in secret

In the Sermon on the Mount, Jesus assumes his hearers will fast. His concern is who is watching:

{{matthew 6:16-18|KJV}}

The same pattern governs giving and prayer in the same chapter ([[matthew 6:1-6]]). Fasting is good; fasting for an audience is not. Later, Jesus says his disciples will fast "when the bridegroom shall be taken from them" ([[matthew 9:15]]).

## Thomas: guilt

In the Gospel of Thomas, the disciples ask about the same three practices — fasting, prayer, and giving — and about food, and get a startling reply:

{{thomas 6:1-2}}

Jesus does not answer the questions. He replaces them with two commands: don't lie, and don't do what you hate. Later the answer is sharper:

{{thomas 14:1}}

The saying goes on to repeat a line we also know from Mark and Matthew: it is not what goes into your mouth that defiles you, but what comes out ([[thomas 14:2]]; compare [[mark 7:15]]).

## Three positions

- **Isaiah:** fasting is good if it becomes justice.
- **Matthew:** fasting is good if it is hidden.
- **Thomas:** fasting, as a religious performance, is dangerous; what matters is honesty and what comes out of you.

Christians have mostly followed Matthew; Lent and other fasts are part of many traditions. Thomas's sayings are harder to place. Some readers see them as a radical spirituality that sets aside external practice; others note that another saying in Thomas says "If you don't fast from the world, you won't find the kingdom" ([[thomas 27]]), and suspect the book is less hostile to fasting than saying 14 sounds.

That tension — inside one book, and between three — is a good reason to read them together. The plan "The Sayings of Jesus: Sermon on the Mount, Q, and Thomas" does exactly that.
""",
    },
    {
        "author": "editors",
        "title": "Mary Magdalene, First Witness",
        "summary": "What the four Gospels, the Gospel of Mary, and the Gospel of Peter say about Mary Magdalene — and what none of them say.",
        "tags": ["women"],
        "body": """
Mary Magdalene is one of the most remembered figures in Christian history, and one of the most misremembered. Let's start with what the texts on this site actually say.

## In the four Gospels

Luke introduces her early, among the women who traveled with Jesus and supported his work:

{{luke 8:1-3|KJV}}

All four Gospels place her at the cross or the tomb. In John she comes to the tomb alone, while it is still dark, and becomes the first person to see the risen Jesus:

{{john 20:16-18|KJV}}

She tells the disciples "that she had seen the LORD." She is the one sent to tell the others. Eastern Christian tradition calls her "equal to the apostles" because of this scene.

## What the Gospels don't say

None of them says she was a prostitute, or a repentant sinner. That picture came later. Luke 7 tells of an unnamed "woman in the city, which was a sinner" who anoints Jesus' feet ([[luke 7:37-38]]). A few verses later, Luke introduces Mary Magdalene as a new character ([[luke 8:2]]). In the Western church, a sermon by Pope Gregory the Great in 591 merged these women — and Mary of Bethany — into one. The merged figure dominated Western art for more than a thousand years. The Eastern churches never accepted it.

## In the Gospel of Mary

The Gospel of Mary, which survives in fragments, shows her after the resurrection. The disciples are afraid; she comforts them and, at Peter's request, tells them what the Savior revealed to her in a vision. Then the argument begins:

{{mary 5:18}}

Peter asks whether the Savior really spoke privately with a woman and preferred her to them. Levi answers him sharply. The book ends with the disciples going out to preach — reconciled, or at least moving.

Whatever its date and origins, the Gospel of Mary preserves an argument: about authority, about revelation, and about whether a woman could be a teacher of the apostles.

## In the Gospel of Peter

The Gospel of Peter calls her "a disciple of the Lord" and describes her going to the tomb at dawn with her friends ([[peter 12:50-51]]). As in Mark, its tomb scene ends with frightened women who flee ([[peter 13:57]]).

## Reading her well

Three cautions, for every side:

1. Don't merge her with other women the texts keep distinct.
2. Don't make the Gospel of Mary say more than its surviving pages do. It does not describe a marriage or a secret lineage; those ideas come from much later fiction.
3. Don't overlook what the canonical Gospels already give her. She is the first witness of the resurrection in John, and among the first in Matthew and Mark. That alone is remarkable.

Discuss on [[john 20:17]], or follow the plan "Women Who Spoke: From Ruth to Mary Magdalene."
""",
    },
    {
        "author": "editors",
        "title": "Job's Friends Were Wrong: Suffering Without an Explanation",
        "summary": "The book of Job lets its pious characters defend God for most of the book, then says they were wrong. What does that do to our explanations of suffering?",
        "tags": ["suffering"],
        "body": """
The book of Job is often summarized as "a good man suffers and keeps his faith." That is the first two chapters. The rest of the book is a fight.

## The friends' case

Job's three friends come to comfort him, and for seven days they say nothing ([[job 2:13]]) — the best thing they do in the book. Then they start talking. Their argument is simple: God is just, so suffering must be deserved.

{{job 4:7-8|KJV}}

Over many chapters they become harsher. Eliphaz eventually accuses Job of specific sins that the book has given us no reason to believe ([[job 22:5-7]]).

## Job's case

Job refuses. He knows he has not done what they say, and he says so, and he demands that God answer him:

{{job 23:3-4|KJV}}

Some of his speeches come close to accusing God of cruelty ([[job 9:22-24]]). If you are used to hearing the Bible defend God, these chapters are startling.

## God's answer

When God finally speaks "out of the whirlwind," it is not an explanation:

{{job 38:4|KJV}}

God takes Job on a tour of creation — stars, sea, snow, wild goats, the war-horse, the eagle, the great beasts. Nothing about the wager in chapter 1. Nothing about why Job's children died. Job responds with humility ([[job 42:5-6]]).

## The verdict

And then the most surprising verse in the book:

{{job 42:7|KJV}}

The friends, who defended God, did not speak rightly. Job, who accused God, did. The book that seemed to be about patience turns out to be about honesty.

## What we do with that

Readers have drawn different lessons:

- **Protest can be faithful.** Job spoke *to* God; the friends spoke *about* God. Honest complaint is a form of prayer, as the psalms of lament also show.
- **Explanations can be cruel.** The friends' theology was used as a weapon against a suffering man. When someone is in pain, "you must have deserved it" is never a comfort.
- **The book refuses to explain.** God's speeches do not answer the question of innocent suffering. Some readers find that unsatisfying; others think it is the point.

And then there is the ending: Job's fortunes restored double, new children, a long life ([[job 42:10-17]]). Many readers find this ending hard. The first children are not brought back. Whatever the epilogue means, it does not erase the poem before it.

Discuss on [[job 42:7]], or follow "Wisdom in 14 Days," which reads Job next to Proverbs and Ecclesiastes.
""",
    },
    {
        "author": "editors",
        "title": "Three Versions of the Lord's Prayer",
        "summary": "Matthew's, Luke's, and the reconstructed Q version differ in length and wording. Comparing them shows how a prayer was remembered and prayed.",
        "tags": ["prayer"],
        "body": """
The Lord's Prayer is the most prayed text in Christianity. It also exists in more than one version, and this site lets you see them side by side.

## Matthew

In the Sermon on the Mount:

{{matthew 6:9-13|KJV}}

Now switch the translation menu to Nestle 1904 (GRC) and look at verse 13. The prayer ends with "deliver us from evil." The doxology — "For thine is the kingdom, and the power, and the glory, for ever" — is not in the earliest manuscripts of Matthew. It is in the TR (GRC), the Greek text behind the KJV, and many churches still pray it. An early Christian manual, the Didache, already has a similar ending. It is very old; it just doesn't seem to be Matthew's.

## Luke

Luke places the prayer in a different setting — a disciple asks Jesus to teach them to pray, as John taught his disciples:

{{luke 11:2-4|KJV}}

Look carefully: the KJV here follows later manuscripts that have made Luke more like Matthew. Modern critical texts of Luke are shorter still: "Father" rather than "Our Father which art in heaven," and no "Thy will be done." Luke also says "sins" where Matthew says "debts."

## Q

Many scholars think Matthew and Luke both drew on a lost collection of sayings, called Q. The reconstruction on this site gives one version of what Q's prayer might have looked like:

{{quelle 11:2-4}}

It is a scholarly reconstruction, not a manuscript, but it shows what the two Gospels have in common.

## What the differences tell us

1. **The prayer was prayed before it was written.** Small differences in wording are what happens to words said aloud in different communities.
2. **The prayer grew.** The doxology at the end of Matthew is a good example of how a prayer used in worship gained a liturgical close.
3. **The core did not change.** In every version: God as Father, God's name honored, God's reign asked for, daily bread, forgiveness that is tied to forgiving, and protection in trial.

## Try it

Pray it slowly in each version. Notice which phrases you miss when they are gone, and which you didn't know were added. The comment thread on [[matthew 6:13]] explains the doxology in more detail.
""",
    },
    {
        "author": "editors",
        "title": "Hevel: Ecclesiastes and the Vapor of Things",
        "summary": "\"Vanity of vanities\" may mean something closer to breath or mist. Reading Ecclesiastes with that image changes the book.",
        "tags": ["death-and-resurrection", "suffering"],
        "body": """
Ecclesiastes begins with a sentence everyone knows:

{{ecclesiastes 1:2|KJV}}

The word translated "vanity" is the Hebrew *hevel*, which appears dozens of times in the book. Its basic meaning is breath, or vapor — something real but fleeting, impossible to hold. The Japanese 口語訳 renders it 「空」, "empty." Open the Hebrew (WLC) beside the KJV and you can see the word repeated in verse 2 like a drumbeat.

## Vapor, not nothing

"Vanity" in modern English suggests pride, or worthlessness. "Vapor" suggests something else: not that life is meaningless, but that it cannot be grasped. You can see breath on a cold morning; you cannot keep it.

Read the opening poem with that in mind:

{{ecclesiastes 1:4-7|KJV}}

The earth abides. The sun, the wind, the rivers keep their courses. It is human beings who come and go. The Preacher is not saying the world is empty; he is saying we are brief in it.

## Everything tried

The book's narrator tries everything: wisdom, pleasure, building, wealth ([[ecclesiastes 2:4-11]]). Every experiment ends with the same word: *hevel*. Even wisdom, which he values, ends in the same death as folly ([[ecclesiastes 2:14-16]]).

## What remains

And yet the book keeps returning to a quiet piece of advice:

{{ecclesiastes 2:24|KJV}}

Eat, drink, enjoy your work, love the people you are with ([[ecclesiastes 9:7-9]]). Some readers hear this as resignation. Others hear it as the book's real wisdom: if life is vapor, the right response is not despair but attention — to the bread, the wine, the person beside you, today.

## A time for everything

The most famous passage in the book belongs here too:

{{ecclesiastes 3:1-4|KJV}}

It is often read at funerals and weddings alike. Notice that it does not say which time it is now. It only says that everything has one.

## The ending

The last verses tell the reader to fear God and keep his commandments ([[ecclesiastes 12:13-14]]). Many scholars think these were added by a later editor, who wanted to frame the book safely; others read them as the Preacher's own conclusion. Either way, the book that precedes them is not tidy, and it has outlasted every attempt to tidy it.

The editors' thread on [[ecclesiastes 1:2]] sets out three readings of the opening. The plan "Wisdom in 14 Days" reads chapters 1, 3 and 12.
""",
    },
    {
        "author": "editors",
        "title": "Resurrection Before Easter: Daniel 12, 2 Maccabees 7, and 1 Corinthians 15",
        "summary": "Belief in bodily resurrection appears late in the Hebrew Bible and grows in times of persecution. Three texts trace how the hope took shape.",
        "tags": ["death-and-resurrection"],
        "body": """
For most of the Hebrew Bible, the dead go to Sheol, a shadowy place where, as one psalm puts it, no one praises God ([[psalms 6:5]]). Then, late in its history, a new hope appears.

## Daniel 12

The clearest statement in the Hebrew Bible comes at the end of Daniel:

{{daniel 12:2|KJV}}

"Many" — not all — will awake, some to life and some to shame. The context is persecution: Daniel's visions concern a time of terrible suffering for the faithful. The resurrection is God's answer to deaths that seem to have no justice.

## 2 Maccabees 7

2 Maccabees, read as Scripture by Catholic and Orthodox Christians, tells the story of a mother and her seven sons tortured by a king for refusing to eat pork. As they die, they speak of resurrection:

{{2-maccabees 7:9}}

The fourth son says to the king that for him there will be "no resurrection to life" ([[2-maccabees 7:14]]). And the mother encourages her youngest by pointing to God the Creator:

{{2-maccabees 7:28}}

That verse is also an early statement of creation out of nothing — which makes sense: if God can create from nothing, God can restore the dead.

## 1 Corinthians 15

Paul writes the longest discussion of resurrection in the New Testament. For him everything hangs on Christ's:

{{1-corinthians 15:12-14|KJV}}

He answers the question "With what body do they come?" with an image from farming: a seed is sown and a plant rises, different and yet continuous ([[1-corinthians 15:35-38]]). Near the end of the chapter comes a taunt: "O death, where is thy sting?" ([[1-corinthians 15:55]]).

## What connects them

All three texts link resurrection to justice and to the faithfulness of God. The martyrs of Maccabees die for God's law; Daniel's faithful suffer under a tyrant; Paul's Christ is executed and vindicated. Resurrection is not, in these texts, a general belief in the immortality of the soul. It is the conviction that God will not let death have the last word over those who trusted him.

Jesus' own debate with the Sadducees, who denied the resurrection, is in [[mark 12:18-27]]. Hebrews alludes to martyrs who refused deliverance "that they might obtain a better resurrection" ([[hebrews 11:35]]) — very likely a reference to the stories in 2 Maccabees.

Discuss the martyrs' story on [[2-maccabees 7:9]].
""",
    },
    {
        "author": "editors",
        "title": "Seventy Times Seven: Forgiveness from Joseph to Jesus",
        "summary": "Joseph forgives the brothers who sold him; Jesus tells Peter to forgive without counting. What forgiveness requires — and what it doesn't — in both stories.",
        "tags": ["forgiveness"],
        "body": """
Peter asks a reasonable question:

{{matthew 18:21-22|KJV}}

Seven times would already be generous. "Seventy times seven" is a way of saying: stop counting. Then Jesus tells a parable about a servant forgiven a debt he could never repay, who then refuses to forgive a small debt owed to him ([[matthew 18:23-35]]). The parable ends with a warning, not a comfort.

## Joseph

One of the longest stories of forgiveness in the Bible is in Genesis. Joseph's brothers sell him into slavery. Years later, he is the most powerful man in Egypt and they come to him for food, not recognizing him.

He does not forgive them at once. He tests them, for chapters, until Judah offers himself as a slave in place of Benjamin ([[genesis 44:33-34]]). Only then does Joseph reveal himself, weeping:

{{genesis 45:4-5|KJV}}

After their father dies, the brothers fear revenge. Joseph's answer is one of the great sentences of the Bible:

{{genesis 50:19-21|KJV}}

## What forgiveness is, in these stories

Put the two together and some things become clear.

- **Forgiveness names the wrong.** Joseph does not say "it was nothing." He says "ye thought evil against me." The servant's debt in the parable is huge, and the text says so.
- **Forgiveness is not the same as trust.** Joseph tests his brothers before he reveals himself. Forgiving someone does not require pretending they have changed.
- **Forgiveness gives up the right to judge.** "Am I in the place of God?" Joseph will not be his brothers' judge.
- **Forgiveness is tied to being forgiven.** The parable makes this explicit, as does the Lord's Prayer ([[matthew 6:12]]).

## A caution

These texts have sometimes been used to pressure victims into quick reconciliation with people who are still harming them. Neither story supports that. Joseph's forgiveness came from a position of safety and power, after years, with full acknowledgment of the wrong. "Seventy times seven" is a command about the heart of the one who forgives, not a demand that the vulnerable return to danger.

The editors' thread on [[genesis 50:20]] discusses exactly this tension.
""",
    },
]

ARTICLES = ARTICLES + MORE_ARTICLES
