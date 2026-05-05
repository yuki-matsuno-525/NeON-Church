export const BOOKS = [
  { slug: "matthew", name: "マタイによる福音書", short: "マタイ" },
  { slug: "mark", name: "マルコによる福音書", short: "マルコ" },
  { slug: "luke", name: "ルカによる福音書", short: "ルカ" },
  { slug: "john", name: "ヨハネによる福音書", short: "ヨハネ" },
] as const;

export type BookSlug = (typeof BOOKS)[number]["slug"];

export function getBookBySlug(slug: string) {
  return BOOKS.find((b) => b.slug === slug) ?? null;
}

export function isValidSlug(slug: string): slug is BookSlug {
  return BOOKS.some((b) => b.slug === slug);
}
