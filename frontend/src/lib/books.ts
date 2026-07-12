// 本の一覧と表示用メタデータ（フロント側の唯一の定義元）。
// バックエンドは「本文置き場」で、本は (name, translation) で複数訳を持つ。
// ここでは slug ごとに、表示名・ジャンル・その本が持つ訳（DB 上の name）を定義する。

import { translationLang } from "@/lib/translations";

// 整理の軸はジャンル（文学種別）。正典/外典といった区分は設けない。
// 本があるジャンルだけ表示される（read ページ側で空ジャンルを除外）。
export const GENRE_ORDER = ["律法", "歴史", "詩歌", "預言", "福音書", "使徒・書簡", "黙示", "旧約偽典"] as const;
export type BookGenre = (typeof GENRE_ORDER)[number];

// その本が持つ訳。id は DB の Book.translation、name は DB の Book.name。
export type BookTranslation = { id: string; name: string };

// 章番号→章名（任意）。章が「番号」ではなく「見出し」で区切られる本のための表示名。
// 例: マリアの福音書は章番号 1..5 がセクション見出しに対応する。
// index 0 が第1章。定義しない本は章番号だけで表示される。

export const BOOKS = [
  { slug: "matthew", name: "マタイによる福音書", englishName: "Matthew", short: "マタイ", totalChapters: 28, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "マタイによる福音書" }, { id: "KJV", name: "Matthew" }, { id: "Nestle 1904 (GRC)", name: "ΚΑΤΑ ΜΑΘΘΑΙΟΝ" }] },
  { slug: "mark",    name: "マルコによる福音書", englishName: "Mark",    short: "マルコ", totalChapters: 16, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "マルコによる福音書" }, { id: "KJV", name: "Mark" }, { id: "Nestle 1904 (GRC)", name: "ΚΑΤΑ ΜΑΡΚΟΝ" }] },
  { slug: "luke",    name: "ルカによる福音書",   englishName: "Luke",    short: "ルカ",   totalChapters: 24, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "ルカによる福音書" }, { id: "KJV", name: "Luke" }, { id: "Nestle 1904 (GRC)", name: "ΚΑΤΑ ΛΟΥΚΑΝ" }] },
  { slug: "john",    name: "ヨハネによる福音書", englishName: "John",    short: "ヨハネ", totalChapters: 21, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "ヨハネによる福音書" }, { id: "KJV", name: "John" }, { id: "Nestle 1904 (GRC)", name: "ΚΑΤΑ ΙΩΑΝΗΝ" }] },
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
  // エノク書は R. H. Charles 英訳のみ（翻訳プロジェクトの元テキスト）。
  { slug: "enoch",   name: "エノク書",           englishName: "The Book of Enoch", short: "エノク書", totalChapters: 108, genre: "黙示" as BookGenre,
    translations: [{ id: "R. H. Charles (EN)", name: "The Book of Enoch" }] },
  // アダムとエバの生涯（Vita Adae et Evae）は L. S. A. Wells 英訳のみ（パブリックドメイン）。
  // 章=ローマ数字 i..li、節=アラビア数字。章番号は持つが章名は無い。
  { slug: "adam-and-eve", name: "アダムとエバの生涯", englishName: "The Life of Adam and Eve", short: "アダムとエバ", totalChapters: 51, genre: "旧約偽典" as BookGenre,
    translations: [{ id: "L. S. A. Wells (EN)", name: "The Life of Adam and Eve" }] },
  { slug: "genesis", name: "創世記", englishName: "Genesis", short: "創世記", totalChapters: 50, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Genesis" }] },
  { slug: "exodus", name: "出エジプト記", englishName: "Exodus", short: "出エジプト", totalChapters: 40, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Exodus" }] },
  { slug: "leviticus", name: "レビ記", englishName: "Leviticus", short: "レビ", totalChapters: 27, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Leviticus" }] },
  { slug: "numbers", name: "民数記", englishName: "Numbers", short: "民数", totalChapters: 36, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Numbers" }] },
  { slug: "deuteronomy", name: "申命記", englishName: "Deuteronomy", short: "申命", totalChapters: 34, genre: "律法" as BookGenre,
    translations: [{ id: "KJV", name: "Deuteronomy" }] },
  { slug: "joshua", name: "ヨシュア記", englishName: "Joshua", short: "ヨシュア", totalChapters: 24, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Joshua" }] },
  { slug: "judges", name: "士師記", englishName: "Judges", short: "士師", totalChapters: 21, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Judges" }] },
  { slug: "ruth", name: "ルツ記", englishName: "Ruth", short: "ルツ", totalChapters: 4, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Ruth" }] },
  { slug: "1-samuel", name: "サムエル記上", englishName: "1 Samuel", short: "サムエル上", totalChapters: 31, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "1 Samuel" }] },
  { slug: "2-samuel", name: "サムエル記下", englishName: "2 Samuel", short: "サムエル下", totalChapters: 24, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "2 Samuel" }] },
  { slug: "1-kings", name: "列王紀上", englishName: "1 Kings", short: "列王上", totalChapters: 22, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "1 Kings" }] },
  { slug: "2-kings", name: "列王紀下", englishName: "2 Kings", short: "列王下", totalChapters: 25, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "2 Kings" }] },
  { slug: "1-chronicles", name: "歴代志上", englishName: "1 Chronicles", short: "歴代上", totalChapters: 29, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "1 Chronicles" }] },
  { slug: "2-chronicles", name: "歴代志下", englishName: "2 Chronicles", short: "歴代下", totalChapters: 36, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "2 Chronicles" }] },
  { slug: "ezra", name: "エズラ記", englishName: "Ezra", short: "エズラ", totalChapters: 10, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Ezra" }] },
  { slug: "nehemiah", name: "ネヘミヤ記", englishName: "Nehemiah", short: "ネヘミヤ", totalChapters: 13, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Nehemiah" }] },
  { slug: "esther", name: "エステル記", englishName: "Esther", short: "エステル", totalChapters: 10, genre: "歴史" as BookGenre,
    translations: [{ id: "KJV", name: "Esther" }] },
  { slug: "job", name: "ヨブ記", englishName: "Job", short: "ヨブ", totalChapters: 42, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Job" }] },
  { slug: "psalms", name: "詩篇", englishName: "Psalms", short: "詩篇", totalChapters: 150, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Psalms" }] },
  { slug: "proverbs", name: "箴言", englishName: "Proverbs", short: "箴言", totalChapters: 31, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Proverbs" }] },
  { slug: "ecclesiastes", name: "伝道の書", englishName: "Ecclesiastes", short: "伝道", totalChapters: 12, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Ecclesiastes" }] },
  { slug: "song-of-songs", name: "雅歌", englishName: "Song of Solomon", short: "雅歌", totalChapters: 8, genre: "詩歌" as BookGenre,
    translations: [{ id: "KJV", name: "Song of Solomon" }] },
  { slug: "isaiah", name: "イザヤ書", englishName: "Isaiah", short: "イザヤ", totalChapters: 66, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Isaiah" }] },
  { slug: "jeremiah", name: "エレミヤ書", englishName: "Jeremiah", short: "エレミヤ", totalChapters: 52, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Jeremiah" }] },
  { slug: "lamentations", name: "哀歌", englishName: "Lamentations", short: "哀歌", totalChapters: 5, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Lamentations" }] },
  { slug: "ezekiel", name: "エゼキエル書", englishName: "Ezekiel", short: "エゼキエル", totalChapters: 48, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Ezekiel" }] },
  { slug: "daniel", name: "ダニエル書", englishName: "Daniel", short: "ダニエル", totalChapters: 12, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Daniel" }] },
  { slug: "hosea", name: "ホセア書", englishName: "Hosea", short: "ホセア", totalChapters: 14, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Hosea" }] },
  { slug: "joel", name: "ヨエル書", englishName: "Joel", short: "ヨエル", totalChapters: 3, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Joel" }] },
  { slug: "amos", name: "アモス書", englishName: "Amos", short: "アモス", totalChapters: 9, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Amos" }] },
  { slug: "obadiah", name: "オバデヤ書", englishName: "Obadiah", short: "オバデヤ", totalChapters: 1, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Obadiah" }] },
  { slug: "jonah", name: "ヨナ書", englishName: "Jonah", short: "ヨナ", totalChapters: 4, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Jonah" }] },
  { slug: "micah", name: "ミカ書", englishName: "Micah", short: "ミカ", totalChapters: 7, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Micah" }] },
  { slug: "nahum", name: "ナホム書", englishName: "Nahum", short: "ナホム", totalChapters: 3, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Nahum" }] },
  { slug: "habakkuk", name: "ハバクク書", englishName: "Habakkuk", short: "ハバクク", totalChapters: 3, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Habakkuk" }] },
  { slug: "zephaniah", name: "ゼパニヤ書", englishName: "Zephaniah", short: "ゼパニヤ", totalChapters: 3, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Zephaniah" }] },
  { slug: "haggai", name: "ハガイ書", englishName: "Haggai", short: "ハガイ", totalChapters: 2, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Haggai" }] },
  { slug: "zechariah", name: "ゼカリヤ書", englishName: "Zechariah", short: "ゼカリヤ", totalChapters: 14, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Zechariah" }] },
  { slug: "malachi", name: "マラキ書", englishName: "Malachi", short: "マラキ", totalChapters: 4, genre: "預言" as BookGenre,
    translations: [{ id: "KJV", name: "Malachi" }] },
  { slug: "acts", name: "使徒行伝", englishName: "Acts", short: "使徒", totalChapters: 28, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Acts" }] },
  { slug: "romans", name: "ローマ人への手紙", englishName: "Romans", short: "ローマ", totalChapters: 16, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Romans" }] },
  { slug: "1-corinthians", name: "コリント人への第一の手紙", englishName: "1 Corinthians", short: "Iコリント", totalChapters: 16, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 Corinthians" }] },
  { slug: "2-corinthians", name: "コリント人への第二の手紙", englishName: "2 Corinthians", short: "IIコリント", totalChapters: 13, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 Corinthians" }] },
  { slug: "galatians", name: "ガラテヤ人への手紙", englishName: "Galatians", short: "ガラテヤ", totalChapters: 6, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Galatians" }] },
  { slug: "ephesians", name: "エペソ人への手紙", englishName: "Ephesians", short: "エペソ", totalChapters: 6, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Ephesians" }] },
  { slug: "philippians", name: "ピリピ人への手紙", englishName: "Philippians", short: "ピリピ", totalChapters: 4, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Philippians" }] },
  { slug: "colossians", name: "コロサイ人への手紙", englishName: "Colossians", short: "コロサイ", totalChapters: 4, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Colossians" }] },
  { slug: "1-thessalonians", name: "テサロニケ人への第一の手紙", englishName: "1 Thessalonians", short: "Iテサロニケ", totalChapters: 5, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 Thessalonians" }] },
  { slug: "2-thessalonians", name: "テサロニケ人への第二の手紙", englishName: "2 Thessalonians", short: "IIテサロニケ", totalChapters: 3, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 Thessalonians" }] },
  { slug: "1-timothy", name: "テモテへの第一の手紙", englishName: "1 Timothy", short: "Iテモテ", totalChapters: 6, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 Timothy" }] },
  { slug: "2-timothy", name: "テモテへの第二の手紙", englishName: "2 Timothy", short: "IIテモテ", totalChapters: 4, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 Timothy" }] },
  { slug: "titus", name: "テトスへの手紙", englishName: "Titus", short: "テトス", totalChapters: 3, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Titus" }] },
  { slug: "philemon", name: "ピレモンへの手紙", englishName: "Philemon", short: "ピレモン", totalChapters: 1, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Philemon" }] },
  { slug: "hebrews", name: "ヘブル人への手紙", englishName: "Hebrews", short: "ヘブル", totalChapters: 13, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Hebrews" }] },
  { slug: "james", name: "ヤコブの手紙", englishName: "James", short: "ヤコブ", totalChapters: 5, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "James" }] },
  { slug: "1-peter", name: "ペテロの第一の手紙", englishName: "1 Peter", short: "Iペテロ", totalChapters: 5, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 Peter" }] },
  { slug: "2-peter", name: "ペテロの第二の手紙", englishName: "2 Peter", short: "IIペテロ", totalChapters: 3, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 Peter" }] },
  { slug: "1-john", name: "ヨハネの第一の手紙", englishName: "1 John", short: "Iヨハネ", totalChapters: 5, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "1 John" }] },
  { slug: "2-john", name: "ヨハネの第二の手紙", englishName: "2 John", short: "IIヨハネ", totalChapters: 1, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "2 John" }] },
  { slug: "3-john", name: "ヨハネの第三の手紙", englishName: "3 John", short: "IIIヨハネ", totalChapters: 1, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "3 John" }] },
  { slug: "jude", name: "ユダの手紙", englishName: "Jude", short: "ユダ書", totalChapters: 1, genre: "使徒・書簡" as BookGenre,
    translations: [{ id: "KJV", name: "Jude" }] },
  { slug: "revelation", name: "ヨハネの黙示録", englishName: "Revelation", short: "黙示録", totalChapters: 22, genre: "黙示" as BookGenre,
    translations: [{ id: "KJV", name: "Revelation" }] },
] as const;

export type BookSlug = (typeof BOOKS)[number]["slug"];

export function getBookBySlug(slug: string) {
  return BOOKS.find((b) => b.slug === slug) ?? null;
}

export function isValidSlug(slug: string): slug is BookSlug {
  return BOOKS.some((b) => b.slug === slug);
}

/** slug と章番号から章名を返す。章名を持たない本・範囲外は null。 */
export function chapterTitle(slug: string, chapterNumber: number): string | null {
  // BOOKS は as const のため、chapterTitles を持つ本と持たない本のユニオンになる。
  // in で絞り込んでから参照する。
  const book = getBookBySlug(slug);
  const titles = book && "chapterTitles" in book ? book.chapterTitles : undefined;
  return titles?.[chapterNumber - 1] ?? null;
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
