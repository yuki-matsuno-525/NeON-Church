export const BOOKS = [
  { slug: "matthew", name: "マタイによる福音書", short: "マタイ", totalChapters: 28 },
  { slug: "mark",    name: "マルコによる福音書", short: "マルコ", totalChapters: 16 },
  { slug: "luke",    name: "ルカによる福音書",   short: "ルカ",   totalChapters: 24 },
  { slug: "john",    name: "ヨハネによる福音書", short: "ヨハネ", totalChapters: 21 },
] as const;

export type BookSlug = (typeof BOOKS)[number]["slug"];

export function getBookBySlug(slug: string) {
  return BOOKS.find((b) => b.slug === slug) ?? null;
}

export function isValidSlug(slug: string): slug is BookSlug {
  return BOOKS.some((b) => b.slug === slug);
}
