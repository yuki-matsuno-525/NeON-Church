"use client";

// 「書（slug）→ その書が持つ訳 → DB の Book id」を引くためのカタログ。
// DB の Book は (name, translation) 単位で別 id を持つ。QA / Translate では
// まず書（slug）を選び、次にその書が持つ訳（バージョン）を選ばせるため、
// slug ごとに「訳 id → DB Book id」をまとめておく。

import { useEffect, useState } from "react";
import { fetchBooks, type Book } from "@/lib/api";
import { BOOKS, slugFromDbName } from "@/lib/books";

export type CatalogTranslation = { id: string; bookId: string };
export type BookCatalogEntry = { slug: string; translations: CatalogTranslation[] };

/** 全訳の DB Book 一覧から、books.ts の並び順でカタログを組み立てる。 */
export function buildCatalog(dbBooks: Book[]): BookCatalogEntry[] {
  const bySlug = new Map<string, CatalogTranslation[]>();
  for (const b of dbBooks) {
    const slug = slugFromDbName(b.name);
    if (!slug) continue;
    const arr = bySlug.get(slug) ?? [];
    arr.push({ id: b.translation, bookId: b.id });
    bySlug.set(slug, arr);
  }
  // books.ts の並び（書順・各書の訳順）に合わせて整列。DB に無い書/訳は除く。
  return BOOKS.flatMap((meta) => {
    const found = bySlug.get(meta.slug);
    if (!found) return [];
    const translations = meta.translations
      .map((tr) => found.find((f) => f.id === tr.id))
      .filter((x): x is CatalogTranslation => x != null);
    return translations.length ? [{ slug: meta.slug, translations }] : [];
  });
}

/** DB の全 Book を取得してカタログを返すフック。 */
export function useBookCatalog(): BookCatalogEntry[] {
  const [catalog, setCatalog] = useState<BookCatalogEntry[]>([]);
  useEffect(() => {
    fetchBooks()
      .then((all) => setCatalog(buildCatalog(all)))
      .catch(() => {});
  }, []);
  return catalog;
}

/** カタログから slug のエントリを返す。 */
export function catalogEntry(catalog: BookCatalogEntry[], slug: string): BookCatalogEntry | null {
  return catalog.find((e) => e.slug === slug) ?? null;
}
