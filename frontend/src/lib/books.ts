// 本の一覧と表示用メタデータ（フロント側の唯一の定義元）。
// バックエンドは「本文置き場」で、本は (name, translation) で複数訳を持つ。
// ここでは slug ごとに、表示名・ジャンル・その本が持つ訳（DB 上の name）を定義する。

// 整理の軸はジャンル（文学種別）。正典/外典といった区分は設けない。
// 本があるジャンルだけ表示される（read ページ側で空ジャンルを除外）。
export const GENRE_ORDER = ["福音書", "黙示"] as const;
export type BookGenre = (typeof GENRE_ORDER)[number];

// その本が持つ訳。id は DB の Book.translation、name は DB の Book.name。
export type BookTranslation = { id: string; name: string };

export const BOOKS = [
  { slug: "matthew", name: "マタイによる福音書", englishName: "Matthew", short: "マタイ", totalChapters: 28, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "マタイによる福音書" }, { id: "KJV", name: "Matthew" }] },
  { slug: "mark",    name: "マルコによる福音書", englishName: "Mark",    short: "マルコ", totalChapters: 16, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "マルコによる福音書" }, { id: "KJV", name: "Mark" }] },
  { slug: "luke",    name: "ルカによる福音書",   englishName: "Luke",    short: "ルカ",   totalChapters: 24, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "ルカによる福音書" }, { id: "KJV", name: "Luke" }] },
  { slug: "john",    name: "ヨハネによる福音書", englishName: "John",    short: "ヨハネ", totalChapters: 21, genre: "福音書" as BookGenre,
    translations: [{ id: "口語訳", name: "ヨハネによる福音書" }, { id: "KJV", name: "John" }] },
  // エノク書は R. H. Charles 英訳のみ（翻訳プロジェクトの元テキスト）。
  { slug: "enoch",   name: "エノク書",           englishName: "The Book of Enoch", short: "エノク書", totalChapters: 108, genre: "黙示" as BookGenre,
    translations: [{ id: "R. H. Charles (EN)", name: "The Book of Enoch" }] },
] as const;

export type BookSlug = (typeof BOOKS)[number]["slug"];

export function getBookBySlug(slug: string) {
  return BOOKS.find((b) => b.slug === slug) ?? null;
}

export function isValidSlug(slug: string): slug is BookSlug {
  return BOOKS.some((b) => b.slug === slug);
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
