// 本の一覧と表示用メタデータ（フロント側の唯一の定義元）。
// バックエンドは「本文置き場」で、本は (name, translation) で複数訳を持つ。
// ここでは slug ごとに、表示名・ジャンル・その本が持つ訳（DB 上の name）を定義する。

import { translationLang } from "@/lib/translations";

// 整理の軸はジャンル（文学種別）。正典/外典といった区分は設けない。
// 本があるジャンルだけ表示される（read ページ側で空ジャンルを除外）。
export const GENRE_ORDER = ["律法", "歴史", "詩歌", "預言", "第二正典", "福音書", "使徒・書簡", "黙示", "旧約偽典"] as const;
export type BookGenre = (typeof GENRE_ORDER)[number];

// その本が持つ訳。id は DB の Book.translation、name は DB の Book.name。
export type BookTranslation = { id: string; name: string };

// 章番号→章名（任意）。章が「番号」ではなく「見出し」で区切られる本のための表示名。
// 例: マリアの福音書は章番号 1..5 がセクション見出しに対応する。
// index 0 が第1章。定義しない本は章番号だけで表示される。
//
// firstChapter は最初の章番号（既定 1）。トマスの福音書だけは "トマス114" のように
// 語番号で引用されるため章番号を語番号に一致させており、冒頭の Prologue が第0章になる。
// その本では chapterTitles の index 0 が第0章を指す。

export const BOOKS = [
  // --- 第二正典（七十人訳が含む書）---
  // 底本・訳ともパブリックドメインの Brenton 七十人訳英訳（1851）。
  // 章・節は原文が番号を持つ。枝番の節（トビト 4:7a など）は親の節に本文をつないである。
  { slug: "tobit", name: "トビト記", englishName: "Tobit", short: "トビト", totalChapters: 14, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Tobit" }] },
  { slug: "judith", name: "ユディト記", englishName: "Judith", short: "ユディト", totalChapters: 16, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Judith" }] },
  { slug: "wisdom", name: "知恵の書", englishName: "Wisdom Of Solomon", short: "知恵", totalChapters: 19, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Wisdom Of Solomon" }] },
  { slug: "sirach", name: "シラ書（集会の書）", englishName: "Sirach", short: "シラ", totalChapters: 51, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Sirach" }] },
  { slug: "baruch", name: "バルク書", englishName: "Baruch", short: "バルク", totalChapters: 5, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Baruch" }] },
  { slug: "epistle-of-jeremy", name: "エレミヤの手紙", englishName: "Epistle of Jeremy", short: "エレミヤ書簡", totalChapters: 1, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Epistle of Jeremy" }] },
  { slug: "susanna", name: "スザンナ", englishName: "Susanna", short: "スザンナ", totalChapters: 1, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Susanna" }] },
  { slug: "bel-and-the-dragon", name: "ベルと竜", englishName: "Bel and the Dragon", short: "ベルと竜", totalChapters: 1, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Bel and the Dragon" }] },
  { slug: "1-maccabees", name: "マカバイ記一", englishName: "Maccabees I", short: "マカバイ一", totalChapters: 16, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Maccabees I" }] },
  { slug: "2-maccabees", name: "マカバイ記二", englishName: "Maccabees II", short: "マカバイ二", totalChapters: 15, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Maccabees II" }] },
  { slug: "1-esdras", name: "エズラ記（ギリシア語）", englishName: "Esdras I", short: "エズラ一", totalChapters: 9, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Esdras I" }] },
  { slug: "prayer-of-manasseh", name: "マナセの祈り", englishName: "Prayer of Manasses", short: "マナセ", totalChapters: 1, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Prayer of Manasses" }] },
  { slug: "3-maccabees", name: "マカバイ記三", englishName: "Maccabees III", short: "マカバイ三", totalChapters: 7, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Maccabees III" }] },
  { slug: "4-maccabees", name: "マカバイ記四", englishName: "Maccabees IV", short: "マカバイ四", totalChapters: 18, genre: "第二正典" as BookGenre,
    translations: [{ id: "L. C. L. Brenton (EN)", name: "Maccabees IV" }] },
  { slug: "matthew", name: "マタイによる福音書", englishName: "Matthew", short: "マタイ", totalChapters: 28, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "マタイによる福音書" }, { id: "KJV", name: "Matthew" }, { id: "Nestle 1904 (GRC)", name: "ΚΑΤΑ ΜΑΘΘΑΙΟΝ" }, { id: "TR (GRC)", name: "Κατα Ματθαιον" }, { id: "文語訳", name: "マタイ傳福音書" }] },
  { slug: "mark",    name: "マルコによる福音書", englishName: "Mark",    short: "マルコ", totalChapters: 16, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "マルコによる福音書" }, { id: "KJV", name: "Mark" }, { id: "Nestle 1904 (GRC)", name: "ΚΑΤΑ ΜΑΡΚΟΝ" }, { id: "TR (GRC)", name: "Κατα Μαρκον" }, { id: "文語訳", name: "マルコ傳福音書" }] },
  { slug: "luke",    name: "ルカによる福音書",   englishName: "Luke",    short: "ルカ",   totalChapters: 24, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "ルカによる福音書" }, { id: "KJV", name: "Luke" }, { id: "Nestle 1904 (GRC)", name: "ΚΑΤΑ ΛΟΥΚΑΝ" }, { id: "TR (GRC)", name: "Κατα Λουκαν" }, { id: "文語訳", name: "ルカ傳福音書" }] },
  { slug: "john",    name: "ヨハネによる福音書", englishName: "John",    short: "ヨハネ", totalChapters: 21, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "ヨハネによる福音書" }, { id: "KJV", name: "John" }, { id: "Nestle 1904 (GRC)", name: "ΚΑΤΑ ΙΩΑΝΗΝ" }, { id: "TR (GRC)", name: "Κατα Ιωαννην" }, { id: "文語訳", name: "ヨハネ傳福音書" }] },
  // マリアの福音書は Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章は写本のセクション見出し、節はページ番号（7〜19, 1〜6 と 11〜14 は欠落）。
  { slug: "mary",    name: "マリアの福音書",     englishName: "The Gospel of Mary", short: "マリア", totalChapters: 5, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Gospel of Mary" }],
    chapterTitles: [
      "An Eternal Perspective",
      "The Gospel",
      "Mary and Jesus",
      "Overcoming the Powers",
      "Conflict over Authority",
    ] },
  // トマスによる幼児福音書も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章=「Chapter N: タイトル」、節=段落先頭の (1)(2)…。
  { slug: "infancy-thomas", name: "トマスによる幼児福音書", englishName: "The Infancy Gospel of Thomas", short: "幼児トマス", totalChapters: 19, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Infancy Gospel of Thomas" }],
    chapterTitles: [
      "Prologue",
      "Jesus Makes Sparrows",
      "Jesus Curses Annas’ Son",
      "Jesus Curses a Careless Child",
      "Joseph Confronts Jesus",
      "First Teacher, Zacchaeus",
      "Zacchaeus’ Lament",
      "Jesus’ Response",
      "Jesus Raises Zeno",
      "Jesus Heals a Woodcutter",
      "Jesus Carries Water in his Cloak",
      "Miracle of the Harvest",
      "Miracle of the Bed",
      "Second Teacher",
      "Third Teacher",
      "Jesus Heals James’ Snakebite",
      "Jesus Heals a Baby",
      "Jesus Heals a Builder",
      "Jesus in the Temple",
    ] },
  // ペテロの福音書も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章=セクション見出し、節=丸括弧 (n) で見出しをまたいで連続（Akhmim 写本の 1..60）。
  { slug: "peter", name: "ペテロの福音書", englishName: "The Gospel of Peter", short: "ペテロ", totalChapters: 14, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Gospel of Peter" }],
    chapterTitles: [
      "Pilate and Herod",
      "Joseph Requests Jesus' Body",
      "The Lord is Tortured and Mocked",
      "The Lord is Crucified",
      "The Lord Dies",
      "The Lord is Buried",
      "People React",
      "The Tomb is Secured",
      "Men Descend from Heaven",
      "Emerging from the Tomb",
      "Reporting to Pilate",
      "Mary Magdalene Goes to the Tomb",
      "Encounter at the Tomb",
      "The Disciples Depart",
    ] },
  // ユダの福音書も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章=セクション見出し、節=Codex Tchacos のページ番号 33..58（見出しをまたいで連続）。
  { slug: "judas", name: "ユダの福音書", englishName: "The Gospel of Judas", short: "ユダ", totalChapters: 7, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Gospel of Judas" }],
    chapterTitles: [
      "Introduction",
      "Jesus Criticizes the Disciples",
      "Another Generation",
      "The Disciples' Vision",
      "Jesus and Judas",
      "Jesus Reveals Everything to Judas",
      "The Betrayal",
    ] },
  // Q資料も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // Q は写本が1つも残っていない（マタイとルカから復元された仮説上の書）ため、章節は
  // 慣例に従いルカの番号をそのまま使う。Q はルカ全体には対応しないので章は飛び飛びで、
  // 1 からも始まらない。chapterNumbers に実在する章だけを持たせている。
  { slug: "quelle", name: "Q資料", englishName: "The Gospel of Q", short: "Q", totalChapters: 22, genre: "福音書" as BookGenre,
    chapterNumbers: [3, 4, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 22],
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Gospel of Q" }] },
  // トマスの福音書も Mark M. Mattison 英訳のみ（パブリックドメイン）。底本は NHC II,2。
  // 語録集で "トマス114" のように語番号で引用されるため、章番号＝語番号にしている。
  // そのため冒頭の Prologue だけが第0章（firstChapter: 0）。節は段落の連番。
  { slug: "thomas", name: "トマスの福音書", englishName: "The Gospel of Thomas", short: "トマス", totalChapters: 114, firstChapter: 0, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Gospel of Thomas" }],
    chapterTitles: [
      "Prologue",
      "True Meaning",
      "Seek and Find",
      "Seeking Within",
      "First and Last",
      "Hidden and Revealed",
      "Public Ritual",
      "The Lion and the Human",
      "The Parable of the Fish",
      "The Parable of the Sower",
      "Jesus and Fire (1)",
      "Those Who Are Living Won't Die (1)",
      "James the Just",
      "Thomas' Confession",
      "Public Ministry",
      "Worship",
      "Not Peace, but War",
      "Divine Gift",
      "Beginning and End",
      "Five Trees in Paradise",
      "The Parable of the Mustard Seed",
      "The Parables of the Field, the Bandits, and the Reaper",
      "Making the Two into One",
      "Those Who are Chosen (1)",
      "Light",
      "Love and Protect",
      "Speck and Beam",
      "Fasting and Sabbath",
      "The World is Drunk",
      "Spirit and Body",
      "Divine Presence",
      "Prophet and Doctor",
      "The Parable of the Fortified City",
      "The Parable of the Lamp",
      "The Parable of Those Who Can't See",
      "The Parable of Binding the Strong",
      "Anxiety",
      "Seeing Jesus",
      "Finding Jesus",
      "The Keys of Knowledge",
      "A Grapevine",
      "More and Less",
      "Passing By",
      "The Tree and the Fruit",
      "Blasphemy",
      "Good and Evil",
      "Greater than John the Baptizer",
      "The Parables of Divided Loyalties, New Wine in Old Wineskins, and New Patch on Old Cloth",
      "Unity (1)",
      "Those Who Are Chosen (2)",
      "Our Origin and Identity",
      "The New World",
      "Twenty-Four Prophets",
      "True Circumcision",
      "Those Who Are Poor",
      "Discipleship (1)",
      "The World is a Corpse",
      "The Parable of the Weeds",
      "Finding Life",
      "The Living One",
      "Don't Become a Corpse",
      "Jesus and Salome",
      "Mysteries",
      "The Parable of the Rich Fool",
      "The Parable of the Dinner Party",
      "The Parable of the Sharecroppers",
      "The Rejected Cornerstone",
      "Knowing Isn't Everything",
      "Persecution",
      "Those Who Are Persecuted",
      "Salvation is Within",
      "Destroying the Temple",
      "Not a Divider",
      "Workers for the Harvest",
      "The Empty Well",
      "The Bridal Chamber",
      "The Parable of the Pearl",
      "Jesus is the All",
      "Into the Desert",
      "Listening to the Message",
      "The World is a Body",
      "Riches and Renunciation (1)",
      "Jesus and Fire (2)",
      "Light and Images",
      "Our Previous Images",
      "Adam Wasn't Worthy",
      "Foxes and Birds",
      "Body and Soul",
      "Angels and Prophets",
      "Inside and Outside",
      "Jesus' Yoke is Easy",
      "Reading the Signs",
      "Look and Find",
      "Don't Throw Pearls to Pigs",
      "Knock and It Will Be Opened",
      "Giving Money",
      "The Parable of the Yeast",
      "The Parable of the Jar of Flour",
      "The Parable of the Assassin",
      "Jesus' True Family",
      "Give to Caesar What Belongs to Caesar",
      "Discipleship (2)",
      "The Dog in the Feeding Trough",
      "The Parable of the Bandits",
      "Prayer and Fasting",
      "Knowing Father and Mother",
      "Unity (2)",
      "The Parable of the Lost Sheep",
      "Becoming Like Jesus",
      "The Parable of the Hidden Treasure",
      "Riches and Renunciation (2)",
      "Those Who are Living Won't Die (2)",
      "Flesh and Soul",
      "The Kingdom is Already Present",
      "Peter and Mary",
    ] },
  // イエスの語録・P.Oxy 5575 も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 2024年公刊のオクシュリンコス断片。章=断片の表裏、節=段落の連番（原文に番号が無い）。
  { slug: "poxy5575", name: "イエスの語録 P.Oxy 5575", englishName: "Sayings of Jesus: P.Oxy 5575", short: "P.Oxy 5575", totalChapters: 2, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "Sayings of Jesus: P.Oxy 5575" }],
    chapterTitles: [
      "recto (→)",
      "verso (↓)",
    ] },
  // 知られざる福音書・エゲルトン・パピルス2 も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章=断片の表裏、節=段落の連番（原文に番号が無い）。
  { slug: "egerton", name: "知られざる福音書（エゲルトン・パピルス2）", englishName: "The Unknown Gospel: Egerton Papyrus 2", short: "エゲルトン", totalChapters: 4, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Unknown Gospel: Egerton Papyrus 2" }],
    chapterTitles: [
      "Fragment 1, verso (↓)",
      "Fragment 1, recto (→)",
      "Fragment 2, recto (→)",
      "Fragment 2, verso (↓)",
    ] },
  // ヤコブによる幼児福音書（原始福音書）も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章="Chapter N: タイトル"、節=段落先頭の (1)(2)…（章ごとに 1 へ戻る）。
  // 巻末の「第18〜21章の短い異版」の付録は本文と混ざるため取り込んでいない。
  { slug: "infancy-james", name: "ヤコブによる幼児福音書", englishName: "The Infancy Gospel of James", short: "幼児ヤコブ", totalChapters: 25, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Infancy Gospel of James" }],
    chapterTitles: [
      "Joachim's Plight",
      "Anna's Plight",
      "Anna's Lament",
      "The Lord's Promise",
      "Mary's Birth",
      "Mary's First Year",
      "Mary Goes to the Temple",
      "Mary Turns Twelve",
      "Joseph Protects Mary",
      "The Veil of the Temple",
      "The Annunciation",
      "Mary Visits Elizabeth",
      "Joseph Questions Mary",
      "Joseph's Dream",
      "The Chief Priest Questions Mary and Joseph",
      "The Test",
      "The Census",
      "Time Stands Still",
      "Jesus' Birth",
      "Salome's Examination",
      "The Magi",
      "The Slaughter of the Infants",
      "The Murder of Zechariah",
      "Mourning for Zechariah",
      "Conclusion",
    ] },
  // ピリポの福音書も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章=セクション見出し、節=Nag Hammadi 写本のページ番号 51..86（見出しをまたいで連続）。
  { slug: "philip", name: "ピリポの福音書", englishName: "The Gospel of Philip", short: "ピリポ", totalChapters: 18, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Gospel of Philip" }],
    chapterTitles: [
      "Gentiles, Hebrews, and Christians",
      "Life, Death, Light, and Darkness",
      "Names",
      "The Rulers",
      "The Virgin Birth",
      "Jesus, Christ, Messiah, Nazarene",
      "The Resurrection",
      "Seeing Jesus",
      "Father, Son, and Holy Spirit",
      "Humans and Animals",
      "Becoming Christians",
      "The Mystery of Marriage",
      "Overcoming the World",
      "Adam, Eve, and the Bridal Chamber",
      "Baptism, Chrism, Eucharist, Bridal Chamber",
      "Spiritual Growth",
      "Uprooting Evil",
      "Conclusion",
    ] },
  // 真理の福音書も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章=セクション見出し、節=Nag Hammadi 写本のページ番号 16..43（見出しをまたいで連続）。
  { slug: "truth", name: "真理の福音書", englishName: "The Gospel of Truth", short: "真理", totalChapters: 16, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Gospel of Truth" }],
    chapterTitles: [
      "Prologue",
      "Error and Forgetfulness",
      "The Gospel",
      "The Book of the Living",
      "The Return to Unity",
      "The Parable of the Jars",
      "Coming into Being",
      "The Parable of the Nightmares",
      "The Revelation of the Son",
      "The Parable of the Sheep",
      "Doing the Father's Will",
      "Restoring what was Needed",
      "The Father's Paradise",
      "The Father's Name",
      "The Place of Rest",
      "Conclusion",
    ] },
  // ヤコブの秘密の書も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章=セクション見出し、節=Nag Hammadi 写本のページ番号 1..16（見出しをまたいで連続）。
  { slug: "secret-james", name: "ヤコブの秘密の書", englishName: "The Secret Book of James", short: "ヤコブ秘密", totalChapters: 12, genre: "福音書" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Secret Book of James" }],
    chapterTitles: [
      "Salutation",
      "Prologue",
      "The Savior Appears",
      "Being Filled",
      "The Cross and Death",
      "Prophecies and Parables",
      "Be Saved",
      "Few Have Found the Kingdom",
      "Know Yourselves",
      "Final Words",
      "Heavenly Ascent",
      "Conclusion",
    ] },
  // 秘密のマルコの福音書は Samuel Zinner 英訳のみ（パブリックドメイン）。
  // クレメンスに帰される手紙で、その引用として本文が現れる。原文に節番号が無いため節=段落の連番。
  { slug: "secret-mark", name: "秘密のマルコの福音書", englishName: "The Secret Gospel of Mark", short: "秘密マルコ", totalChapters: 5, genre: "福音書" as BookGenre,
    translations: [{ id: "Samuel Zinner (EN)", name: "The Secret Gospel of Mark" }],
    chapterTitles: [
      "Salutation",
      "The Doctrines of the Carpocratians",
      "A More Spiritual Gospel",
      "Blasphemous Interpretation",
      "The Secret Gospel",
    ] },
  // ストレンジャーの書（Allogenes）も Mark M. Mattison 英訳のみ（パブリックドメイン）。
  // 章=セクション見出し、節=Codex Tchacos 第4文書のページ番号 59..66。
  { slug: "stranger", name: "ストレンジャーの書", englishName: "The Stranger's Book", short: "ストレンジャー", totalChapters: 5, genre: "黙示" as BookGenre,
    translations: [{ id: "Mark M. Mattison (EN)", name: "The Stranger's Book" }],
    chapterTitles: [
      "Introduction",
      "The Temptation of Stranger",
      "The Transfiguration of Stranger",
      "The Ascent of Stranger",
      "Conclusion",
    ] },
  // エノク書は R. H. Charles 英訳のみ（翻訳プロジェクトの元テキスト）。
  { slug: "enoch",   name: "エノク書",           englishName: "The Book of Enoch", short: "エノク書", totalChapters: 108, genre: "黙示" as BookGenre,
    translations: [{ id: "R. H. Charles (EN)", name: "The Book of Enoch" }] },
  // アダムとエバの生涯（Vita Adae et Evae）は L. S. A. Wells 英訳のみ（パブリックドメイン）。
  // 章=ローマ数字 i..li、節=アラビア数字。章番号は持つが章名は無い。
  { slug: "adam-and-eve", name: "アダムとエバの生涯", englishName: "The Life of Adam and Eve", short: "アダムとエバ", totalChapters: 51, genre: "旧約偽典" as BookGenre,
    translations: [{ id: "L. S. A. Wells (EN)", name: "The Life of Adam and Eve" }] },
  { slug: "genesis", name: "創世記", englishName: "Genesis", short: "創世記", totalChapters: 50, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Genesis" }, { id: "文語訳", name: "創世記" }, { id: "WLC (HEB)", name: "בְּרֵאשִׁית" }, { id: "LXX (GRC)", name: "Γένεση" }, { id: "口語訳", name: "創世記" }] },
  { slug: "exodus", name: "出エジプト記", englishName: "Exodus", short: "出エジプト", totalChapters: 40, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Exodus" }, { id: "文語訳", name: "出埃及記" }, { id: "WLC (HEB)", name: "שְׁמוֹת" }, { id: "LXX (GRC)", name: "Έξοδος" }, { id: "口語訳", name: "出エジプト記" }] },
  { slug: "leviticus", name: "レビ記", englishName: "Leviticus", short: "レビ", totalChapters: 27, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Leviticus" }, { id: "文語訳", name: "利未記" }, { id: "WLC (HEB)", name: "וַיִּקְרָא" }, { id: "LXX (GRC)", name: "Λευιτικόν" }, { id: "口語訳", name: "レビ記" }] },
  { slug: "numbers", name: "民数記", englishName: "Numbers", short: "民数", totalChapters: 36, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Numbers" }, { id: "文語訳", name: "民數紀略" }, { id: "WLC (HEB)", name: "בְּמִדְבַּר" }, { id: "LXX (GRC)", name: "Αριθμοί" }, { id: "口語訳", name: "民数記" }] },
  { slug: "deuteronomy", name: "申命記", englishName: "Deuteronomy", short: "申命", totalChapters: 34, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Deuteronomy" }, { id: "文語訳", name: "申命記" }, { id: "WLC (HEB)", name: "דְּבָרִים" }, { id: "LXX (GRC)", name: "Δευτερονόμιον" }, { id: "口語訳", name: "申命記" }] },
  { slug: "joshua", name: "ヨシュア記", englishName: "Joshua", short: "ヨシュア", totalChapters: 24, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Joshua" }, { id: "文語訳", name: "約書亞記" }, { id: "WLC (HEB)", name: "יְהוֹשֻׁעַ" }, { id: "LXX (GRC)", name: "Ἰησοῦς Nαυῆ" }, { id: "口語訳", name: "ヨシュア記" }] },
  { slug: "judges", name: "士師記", englishName: "Judges", short: "士師", totalChapters: 21, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Judges" }, { id: "文語訳", name: "士師記" }, { id: "WLC (HEB)", name: "שׁוֹפְטִים" }, { id: "LXX (GRC)", name: "Κριταί" }, { id: "口語訳", name: "士師記" }] },
  { slug: "ruth", name: "ルツ記", englishName: "Ruth", short: "ルツ", totalChapters: 4, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Ruth" }, { id: "文語訳", name: "路得記" }, { id: "WLC (HEB)", name: "רוּת" }, { id: "LXX (GRC)", name: "Ῥούθ" }, { id: "口語訳", name: "ルツ記" }] },
  { slug: "1-samuel", name: "サムエル記上", englishName: "1 Samuel", short: "サムエル上", totalChapters: 31, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "1 Samuel" }, { id: "文語訳", name: "撒母耳前書" }, { id: "WLC (HEB)", name: "שְׁמוּאֵל א" }, { id: "LXX (GRC)", name: "1η Σαμουήλ" }, { id: "口語訳", name: "サムエル記上" }] },
  { slug: "2-samuel", name: "サムエル記下", englishName: "2 Samuel", short: "サムエル下", totalChapters: 24, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "2 Samuel" }, { id: "文語訳", name: "撒母耳後書" }, { id: "WLC (HEB)", name: "שְׁמוּאֵל ב" }, { id: "LXX (GRC)", name: "2η Σαμουήλ" }, { id: "口語訳", name: "サムエル記下" }] },
  { slug: "1-kings", name: "列王紀上", englishName: "1 Kings", short: "列王上", totalChapters: 22, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "1 Kings" }, { id: "文語訳", name: "列王紀略上" }, { id: "WLC (HEB)", name: "מְלָכִים א" }, { id: "LXX (GRC)", name: "Βασιλειῶν Γʹ" }, { id: "口語訳", name: "列王紀上" }] },
  { slug: "2-kings", name: "列王紀下", englishName: "2 Kings", short: "列王下", totalChapters: 25, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "2 Kings" }, { id: "文語訳", name: "列王紀略下" }, { id: "WLC (HEB)", name: "מְלָכִים ב" }, { id: "LXX (GRC)", name: "Βασιλειῶν Δʹ" }, { id: "口語訳", name: "列王紀下" }] },
  { slug: "1-chronicles", name: "歴代志上", englishName: "1 Chronicles", short: "歴代上", totalChapters: 29, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "1 Chronicles" }, { id: "文語訳", name: "歴代志略上" }, { id: "WLC (HEB)", name: "דִּבְרֵי הַיָּמִים א" }, { id: "LXX (GRC)", name: "1η Χρονικών" }, { id: "口語訳", name: "歴代志上" }] },
  { slug: "2-chronicles", name: "歴代志下", englishName: "2 Chronicles", short: "歴代下", totalChapters: 36, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "2 Chronicles" }, { id: "文語訳", name: "歴代志略下" }, { id: "WLC (HEB)", name: "דִּבְרֵי הַיָּמִים ב" }, { id: "LXX (GRC)", name: "2η Χρονικών" }, { id: "口語訳", name: "歴代志下" }] },
  { slug: "ezra", name: "エズラ記", englishName: "Ezra", short: "エズラ", totalChapters: 10, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Ezra" }, { id: "文語訳", name: "エズラ書" }, { id: "WLC (HEB)", name: "עֶזְרָא" }, { id: "LXX (GRC)", name: "Ἔσδρας" }, { id: "口語訳", name: "エズラ記" }] },
  { slug: "nehemiah", name: "ネヘミヤ記", englishName: "Nehemiah", short: "ネヘミヤ", totalChapters: 13, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Nehemiah" }, { id: "文語訳", name: "尼希米亞記" }, { id: "WLC (HEB)", name: "נְחֶמְיָה" }, { id: "LXX (GRC)", name: "Νεεμίας" }, { id: "口語訳", name: "ネヘミヤ記" }] },
  { slug: "esther", name: "エステル記", englishName: "Esther", short: "エステル", totalChapters: 10, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Esther" }, { id: "文語訳", name: "以士帖書" }, { id: "WLC (HEB)", name: "אֶסְתֵּר" }, { id: "LXX (GRC)", name: "Ἐσθήρ" }, { id: "口語訳", name: "エステル記" }] },
  { slug: "job", name: "ヨブ記", englishName: "Job", short: "ヨブ", totalChapters: 42, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Job" }, { id: "文語訳", name: "ヨブ記" }, { id: "WLC (HEB)", name: "אִיּוֹב" }, { id: "LXX (GRC)", name: "Ἰώβ" }, { id: "口語訳", name: "ヨブ記" }] },
  { slug: "psalms", name: "詩篇", englishName: "Psalms", short: "詩篇", totalChapters: 150, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Psalms" }, { id: "文語訳", name: "詩篇" }, { id: "WLC (HEB)", name: "תְּהִלִּים" }, { id: "LXX (GRC)", name: "Ψαλμοί" }, { id: "口語訳", name: "詩篇" }] },
  { slug: "proverbs", name: "箴言", englishName: "Proverbs", short: "箴言", totalChapters: 31, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Proverbs" }, { id: "文語訳", name: "箴言" }, { id: "WLC (HEB)", name: "מִשְׁלֵי" }, { id: "LXX (GRC)", name: "Παροιμίαι" }, { id: "口語訳", name: "箴言" }] },
  { slug: "ecclesiastes", name: "伝道の書", englishName: "Ecclesiastes", short: "伝道", totalChapters: 12, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Ecclesiastes" }, { id: "文語訳", name: "傳道之書" }, { id: "WLC (HEB)", name: "קֹהֶלֶת" }, { id: "LXX (GRC)", name: "Ἐκκλησιαστής" }, { id: "口語訳", name: "伝道の書" }] },
  { slug: "song-of-songs", name: "雅歌", englishName: "Song of Solomon", short: "雅歌", totalChapters: 8, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Song of Solomon" }, { id: "文語訳", name: "雅歌" }, { id: "WLC (HEB)", name: "שִׁיר הַשִּׁירִים" }, { id: "LXX (GRC)", name: "Ἆσμα Ἀσμάτων" }, { id: "口語訳", name: "雅歌" }] },
  { slug: "isaiah", name: "イザヤ書", englishName: "Isaiah", short: "イザヤ", totalChapters: 66, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Isaiah" }, { id: "文語訳", name: "以賽亞書" }, { id: "WLC (HEB)", name: "יְשַׁעְיָהוּ" }, { id: "LXX (GRC)", name: "Ἠσαΐας" }, { id: "口語訳", name: "イザヤ書" }] },
  { slug: "jeremiah", name: "エレミヤ書", englishName: "Jeremiah", short: "エレミヤ", totalChapters: 52, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Jeremiah" }, { id: "文語訳", name: "耶利米亞記" }, { id: "WLC (HEB)", name: "יִרְמְיָהוּ" }, { id: "LXX (GRC)", name: "Ἱερεμίας" }, { id: "口語訳", name: "エレミヤ書" }] },
  { slug: "lamentations", name: "哀歌", englishName: "Lamentations", short: "哀歌", totalChapters: 5, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Lamentations" }, { id: "文語訳", name: "耶利米亞哀歌" }, { id: "WLC (HEB)", name: "אֵיכָה" }, { id: "LXX (GRC)", name: "Θρήνοι" }, { id: "口語訳", name: "哀歌" }] },
  { slug: "ezekiel", name: "エゼキエル書", englishName: "Ezekiel", short: "エゼキエル", totalChapters: 48, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Ezekiel" }, { id: "文語訳", name: "以西結書" }, { id: "WLC (HEB)", name: "יְחֶזְקֵאל" }, { id: "LXX (GRC)", name: "Ἰεζεκιήλ" }, { id: "口語訳", name: "エゼキエル書" }] },
  { slug: "daniel", name: "ダニエル書", englishName: "Daniel", short: "ダニエル", totalChapters: 12, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Daniel" }, { id: "文語訳", name: "但以理書" }, { id: "WLC (HEB)", name: "דָּנִיֵּאל" }, { id: "LXX (GRC)", name: "Δανιήλ" }, { id: "口語訳", name: "ダニエル書" }] },
  { slug: "hosea", name: "ホセア書", englishName: "Hosea", short: "ホセア", totalChapters: 14, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Hosea" }, { id: "文語訳", name: "何西阿書" }, { id: "WLC (HEB)", name: "הוֹשֵׁעַ" }, { id: "LXX (GRC)", name: "Ὡσηέ" }, { id: "口語訳", name: "ホセア書" }] },
  { slug: "joel", name: "ヨエル書", englishName: "Joel", short: "ヨエル", totalChapters: 3, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Joel" }, { id: "文語訳", name: "約耳書" }, { id: "WLC (HEB)", name: "יוֹאֵל" }, { id: "LXX (GRC)", name: "Ἰωήλ" }, { id: "口語訳", name: "ヨエル書" }] },
  { slug: "amos", name: "アモス書", englishName: "Amos", short: "アモス", totalChapters: 9, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Amos" }, { id: "文語訳", name: "亞麽士書" }, { id: "WLC (HEB)", name: "עָמוֹס" }, { id: "LXX (GRC)", name: "Ἀμώς" }, { id: "口語訳", name: "アモス書" }] },
  { slug: "obadiah", name: "オバデヤ書", englishName: "Obadiah", short: "オバデヤ", totalChapters: 1, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Obadiah" }, { id: "文語訳", name: "阿巴底亞書" }, { id: "WLC (HEB)", name: "עֹבַדְיָה" }, { id: "LXX (GRC)", name: "Οβαδια" }, { id: "口語訳", name: "オバデヤ書" }] },
  { slug: "jonah", name: "ヨナ書", englishName: "Jonah", short: "ヨナ", totalChapters: 4, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Jonah" }, { id: "文語訳", name: "約拿書" }, { id: "WLC (HEB)", name: "יוֹנָה" }, { id: "LXX (GRC)", name: "Ιώνας" }, { id: "口語訳", name: "ヨナ書" }] },
  { slug: "micah", name: "ミカ書", englishName: "Micah", short: "ミカ", totalChapters: 7, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Micah" }, { id: "文語訳", name: "米迦書" }, { id: "WLC (HEB)", name: "מִיכָה" }, { id: "LXX (GRC)", name: "Μιχαίας" }, { id: "口語訳", name: "ミカ書" }] },
  { slug: "nahum", name: "ナホム書", englishName: "Nahum", short: "ナホム", totalChapters: 3, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Nahum" }, { id: "文語訳", name: "拿翁書" }, { id: "WLC (HEB)", name: "נַחוּם" }, { id: "LXX (GRC)", name: "Ναούμ" }, { id: "口語訳", name: "ナホム書" }] },
  { slug: "habakkuk", name: "ハバクク書", englishName: "Habakkuk", short: "ハバクク", totalChapters: 3, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Habakkuk" }, { id: "文語訳", name: "哈巴谷書" }, { id: "WLC (HEB)", name: "חֲבַקּוּק" }, { id: "LXX (GRC)", name: "Ἀββακούμ" }, { id: "口語訳", name: "ハバクク書" }] },
  { slug: "zephaniah", name: "ゼパニヤ書", englishName: "Zephaniah", short: "ゼパニヤ", totalChapters: 3, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Zephaniah" }, { id: "文語訳", name: "西番雅書" }, { id: "WLC (HEB)", name: "צְפַנְיָה" }, { id: "LXX (GRC)", name: "Σοφονίας" }, { id: "口語訳", name: "ゼパニヤ書" }] },
  { slug: "haggai", name: "ハガイ書", englishName: "Haggai", short: "ハガイ", totalChapters: 2, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Haggai" }, { id: "文語訳", name: "哈基書" }, { id: "WLC (HEB)", name: "חַגַּי" }, { id: "LXX (GRC)", name: "Ἀγγαῖος" }, { id: "口語訳", name: "ハガイ書" }] },
  { slug: "zechariah", name: "ゼカリヤ書", englishName: "Zechariah", short: "ゼカリヤ", totalChapters: 14, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Zechariah" }, { id: "文語訳", name: "撒加利亞書" }, { id: "WLC (HEB)", name: "זְכַרְיָה" }, { id: "LXX (GRC)", name: "Ζαχαρίας" }, { id: "口語訳", name: "ゼカリヤ書" }] },
  { slug: "malachi", name: "マラキ書", englishName: "Malachi", short: "マラキ", totalChapters: 4, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Malachi" }, { id: "文語訳", name: "馬拉基書" }, { id: "WLC (HEB)", name: "מַלְאָכִי" }, { id: "LXX (GRC)", name: "Μαλαχίας" }, { id: "口語訳", name: "マラキ書" }] },
  { slug: "acts", name: "使徒行伝", englishName: "Acts", short: "使徒", totalChapters: 28, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Acts" }, { id: "TR (GRC)", name: "Πραξεις Των Αποστολων" }, { id: "文語訳", name: "使徒行傳" }, { id: "口語訳", name: "使徒行伝" }] },
  { slug: "romans", name: "ローマ人への手紙", englishName: "Romans", short: "ローマ", totalChapters: 16, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Romans" }, { id: "TR (GRC)", name: "Προς Ρωμαιους" }, { id: "文語訳", name: "ロマ人への書" }, { id: "口語訳", name: "ローマ人への手紙" }] },
  { slug: "1-corinthians", name: "コリント人への第一の手紙", englishName: "1 Corinthians", short: "Iコリント", totalChapters: 16, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 Corinthians" }, { id: "TR (GRC)", name: "Προς κορινθιους Α΄" }, { id: "文語訳", name: "コリント人への前の書" }, { id: "口語訳", name: "コリント人への第一の手紙" }] },
  { slug: "2-corinthians", name: "コリント人への第二の手紙", englishName: "2 Corinthians", short: "IIコリント", totalChapters: 13, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 Corinthians" }, { id: "TR (GRC)", name: "Προς κορινθιους Β΄" }, { id: "文語訳", name: "コリント人への後の書" }, { id: "口語訳", name: "コリント人への第二の手紙" }] },
  { slug: "galatians", name: "ガラテヤ人への手紙", englishName: "Galatians", short: "ガラテヤ", totalChapters: 6, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Galatians" }, { id: "TR (GRC)", name: "Προς Γαλατας" }, { id: "文語訳", name: "ガラテヤ人への書" }, { id: "口語訳", name: "ガラテヤ人への手紙" }] },
  { slug: "ephesians", name: "エペソ人への手紙", englishName: "Ephesians", short: "エペソ", totalChapters: 6, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Ephesians" }, { id: "TR (GRC)", name: "Προς Εφεσιους" }, { id: "文語訳", name: "エペソ人への書" }, { id: "口語訳", name: "エペソ人への手紙" }] },
  { slug: "philippians", name: "ピリピ人への手紙", englishName: "Philippians", short: "ピリピ", totalChapters: 4, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Philippians" }, { id: "TR (GRC)", name: "Προς Φιλιππησιους" }, { id: "文語訳", name: "ピリピ人への書" }, { id: "口語訳", name: "ピリピ人への手紙" }] },
  { slug: "colossians", name: "コロサイ人への手紙", englishName: "Colossians", short: "コロサイ", totalChapters: 4, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Colossians" }, { id: "TR (GRC)", name: "Προς Κολοσσαεις" }, { id: "文語訳", name: "コロサイ人への書" }, { id: "口語訳", name: "コロサイ人への手紙" }] },
  { slug: "1-thessalonians", name: "テサロニケ人への第一の手紙", englishName: "1 Thessalonians", short: "Iテサロニケ", totalChapters: 5, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 Thessalonians" }, { id: "TR (GRC)", name: "Προς Θεσσαλονικεις Α΄" }, { id: "文語訳", name: "テサロニケ人への前の書" }, { id: "口語訳", name: "テサロニケ人への第一の手紙" }] },
  { slug: "2-thessalonians", name: "テサロニケ人への第二の手紙", englishName: "2 Thessalonians", short: "IIテサロニケ", totalChapters: 3, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 Thessalonians" }, { id: "TR (GRC)", name: "Προς Θεσσαλονικεις Β΄" }, { id: "文語訳", name: "テサロニケ人への後の書" }, { id: "口語訳", name: "テサロニケ人への第二の手紙" }] },
  { slug: "1-timothy", name: "テモテへの第一の手紙", englishName: "1 Timothy", short: "Iテモテ", totalChapters: 6, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 Timothy" }, { id: "TR (GRC)", name: "Προς Τιμοθεον Α΄" }, { id: "文語訳", name: "テモテへの前の書" }, { id: "口語訳", name: "テモテヘの第一の手紙" }] },
  { slug: "2-timothy", name: "テモテへの第二の手紙", englishName: "2 Timothy", short: "IIテモテ", totalChapters: 4, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 Timothy" }, { id: "TR (GRC)", name: "Προς Τιμοθεον Β΄" }, { id: "文語訳", name: "テモテへの後の書" }, { id: "口語訳", name: "テモテヘの第二の手紙" }] },
  { slug: "titus", name: "テトスへの手紙", englishName: "Titus", short: "テトス", totalChapters: 3, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Titus" }, { id: "TR (GRC)", name: "Προς Τιτον" }, { id: "文語訳", name: "テトスへの書" }, { id: "口語訳", name: "テトスヘの手紙" }] },
  { slug: "philemon", name: "ピレモンへの手紙", englishName: "Philemon", short: "ピレモン", totalChapters: 1, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Philemon" }, { id: "TR (GRC)", name: "Προς Φιλημονα" }, { id: "文語訳", name: "ピレモンへの書" }, { id: "口語訳", name: "ピレモンヘの手紙" }] },
  { slug: "hebrews", name: "ヘブル人への手紙", englishName: "Hebrews", short: "ヘブル", totalChapters: 13, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Hebrews" }, { id: "TR (GRC)", name: "Προς Εβραιους" }, { id: "文語訳", name: "ヘブル人への書" }, { id: "口語訳", name: "ヘブル人への手紙" }] },
  { slug: "james", name: "ヤコブの手紙", englishName: "James", short: "ヤコブ", totalChapters: 5, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "James" }, { id: "TR (GRC)", name: "Ιακωβου" }, { id: "文語訳", name: "ヤコブの書" }, { id: "口語訳", name: "ヤコブの手紙" }] },
  { slug: "1-peter", name: "ペテロの第一の手紙", englishName: "1 Peter", short: "Iペテロ", totalChapters: 5, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 Peter" }, { id: "TR (GRC)", name: "Πετρου Α΄" }, { id: "文語訳", name: "ペテロの前の書" }, { id: "口語訳", name: "ペテロの第一の手紙" }] },
  { slug: "2-peter", name: "ペテロの第二の手紙", englishName: "2 Peter", short: "IIペテロ", totalChapters: 3, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 Peter" }, { id: "TR (GRC)", name: "Πετρου Β΄" }, { id: "文語訳", name: "ペテロの後の書" }, { id: "口語訳", name: "ペテロの第二の手紙" }] },
  { slug: "1-john", name: "ヨハネの第一の手紙", englishName: "1 John", short: "Iヨハネ", totalChapters: 5, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 John" }, { id: "TR (GRC)", name: "Ιωαννου Α΄" }, { id: "文語訳", name: "ヨハネの第一の書" }, { id: "口語訳", name: "ヨハネの第一の手紙" }] },
  { slug: "2-john", name: "ヨハネの第二の手紙", englishName: "2 John", short: "IIヨハネ", totalChapters: 1, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 John" }, { id: "TR (GRC)", name: "Ιωαννου Β΄" }, { id: "文語訳", name: "ヨハネの第二の書" }, { id: "口語訳", name: "ヨハネの第二の手紙" }] },
  { slug: "3-john", name: "ヨハネの第三の手紙", englishName: "3 John", short: "IIIヨハネ", totalChapters: 1, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "3 John" }, { id: "TR (GRC)", name: "Ιωαννου Γ΄" }, { id: "文語訳", name: "ヨハネの第三の書" }, { id: "口語訳", name: "ヨハネの第三の手紙" }] },
  { slug: "jude", name: "ユダの手紙", englishName: "Jude", short: "ユダ書", totalChapters: 1, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Jude" }, { id: "TR (GRC)", name: "Ιουδα" }, { id: "文語訳", name: "ユダの書" }, { id: "口語訳", name: "ユダの手紙" }] },
  { slug: "revelation", name: "ヨハネの黙示録", englishName: "Revelation", short: "黙示録", totalChapters: 22, genre: "黙示" as BookGenre,
    translations: [{ id: "KJV", name: "Revelation" }, { id: "TR (GRC)", name: "Αποκαλυψις Ιωαννου" }, { id: "文語訳", name: "ヨハネの默示録" }, { id: "口語訳", name: "ヨハネの黙示録" }] },
] as const;

export type BookSlug = (typeof BOOKS)[number]["slug"];

export function getBookBySlug(slug: string) {
  return BOOKS.find((b) => b.slug === slug) ?? null;
}

export function isValidSlug(slug: string): slug is BookSlug {
  return BOOKS.some((b) => b.slug === slug);
}

/** slug の最初の章番号を返す（既定 1、トマスの福音書だけ 0）。 */
export function firstChapterOf(slug: string): number {
  const book = getBookBySlug(slug);
  if (book && "chapterNumbers" in book) return book.chapterNumbers[0];
  return book && "firstChapter" in book ? book.firstChapter : 1;
}

/**
 * その本の章番号を昇順で全て返す。
 *
 * ほとんどの本は firstChapter..totalChapters の連番だが、Q資料のように章番号が
 * 飛び飛びの本もある（Q はルカの章番号を使うので 3,4,6,7…22）。章送り・章数の
 * 表示・sitemap はこの関数を通して、連番を前提にしないようにする。
 */
export function chapterNumbersOf(slug: string): number[] {
  const book = getBookBySlug(slug);
  if (!book) return [];
  if ("chapterNumbers" in book) return [...book.chapterNumbers];
  const first = firstChapterOf(slug);
  return Array.from({ length: book.totalChapters - first + 1 }, (_, i) => i + first);
}

/** その本の中で、指定した章の 1 つ前／次の章番号を返す。端なら null。 */
export function adjacentChapter(slug: string, chapterNumber: number): {
  prev: number | null;
  next: number | null;
} {
  const numbers = chapterNumbersOf(slug);
  const i = numbers.indexOf(chapterNumber);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i > 0 ? numbers[i - 1] : null,
    next: i < numbers.length - 1 ? numbers[i + 1] : null,
  };
}

/** slug と章番号から章名を返す。章名を持たない本・範囲外は null。 */
export function chapterTitle(slug: string, chapterNumber: number): string | null {
  // BOOKS は as const のため、chapterTitles を持つ本と持たない本のユニオンになる。
  // in で絞り込んでから参照する。
  const book = getBookBySlug(slug);
  const titles = book && "chapterTitles" in book ? book.chapterTitles : undefined;
  if (!titles) return null;
  // 章番号が飛び飛びの本は「何番目の章か」で章名を引く（連番の本は差で引ける）。
  // BOOKS は as const なので chapterNumbers はリテラルのタプル。number で引くため広げる。
  const index =
    book && "chapterNumbers" in book
      ? (book.chapterNumbers as readonly number[]).indexOf(chapterNumber)
      : chapterNumber - firstChapterOf(slug);
  return index < 0 ? null : (titles[index] ?? null);
}

/** slug とその本の訳 id から、DB 上の Book.name を返す。 */
export function dbNameFor(slug: string, translationId: string): string | null {
  return getBookBySlug(slug)?.translations.find((tr) => tr.id === translationId)?.name ?? null;
}

/** DB 上の Book.name（どの訳でも）から slug を逆引きする。 */
export function slugFromDbName(name: string): string | null {
  const book = BOOKS.find((b) => b.translations.some((tr) => tr.name === name));
  return book?.slug ?? null;
}

/**
 * 表示する訳を選ぶ。希望の訳をその本が持っていればそれを、無ければその本の最初の訳を返す。
 * 英訳しか無いエノク書などは、UI 言語に関わらずその訳で読める。
 */
export function resolveTranslation(slug: string, preferred: string): BookTranslation | null {
  const trs = getBookBySlug(slug)?.translations;
  if (!trs) return null;
  return trs.find((tr) => tr.id === preferred) ?? trs[0];
}

/** その本が指定言語（ja/en）の訳を持つか。エノク書は ja を持たない。 */
export function bookHasLang(slug: string, lang: "ja" | "en"): boolean {
  const trs = getBookBySlug(slug)?.translations;
  return trs?.some((tr) => translationLang(tr.id) === lang) ?? false;
}
