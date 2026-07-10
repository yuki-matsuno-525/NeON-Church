// 本の一覧と表示用メタデータ（フロント側の唯一の定義元）。
// バックエンドは「本文置き場」で、本は (name, translation) で複数訳を持つ。
// ここでは slug ごとに、表示名・ジャンル・その本が持つ訳（DB 上の name）を定義する。

import { translationLang } from "@/lib/translations";

// 整理の軸はジャンル（文学種別）。正典/外典といった区分は設けない。
// 本があるジャンルだけ表示される（read ページ側で空ジャンルを除外）。
export const GENRE_ORDER = ["福音書", "黙示", "旧約偽典"] as const;
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
