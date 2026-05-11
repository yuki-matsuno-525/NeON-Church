export const BOOKS = [
  { slug: "matthew", name: "マタイによる福音書", englishName: "Matthew", short: "マタイ", totalChapters: 28 },
  { slug: "mark",    name: "マルコによる福音書", englishName: "Mark",    short: "マルコ", totalChapters: 16 },
  { slug: "luke",    name: "ルカによる福音書",   englishName: "Luke",    short: "ルカ",   totalChapters: 24 },
  { slug: "john",    name: "ヨハネによる福音書", englishName: "John",    short: "ヨハネ", totalChapters: 21 },
] as const;

export type BookSlug = (typeof BOOKS)[number]["slug"];

export function getBookBySlug(slug: string) {
  return BOOKS.find((b) => b.slug === slug) ?? null;
}

export function isValidSlug(slug: string): slug is BookSlug {
  return BOOKS.some((b) => b.slug === slug);
}
