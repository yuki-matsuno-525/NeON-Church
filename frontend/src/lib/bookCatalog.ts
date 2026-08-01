"use client";

// 「書（slug）→ その書が持つ訳 → DB の Book id」を引くためのカタログ。
// DB の Book は (name, translation) 単位で別 id を持つ。QA / Translate では
// まず書（slug）を選び、次にその書が持つ訳（バージョン）を選ばせるため、
// slug ごとに「訳 id → DB Book id」をまとめておく。

import { useCallback, useEffect, useState } from "react";
import { fetchBooks, type Book } from "@/lib/api";
import { BOOKS, GENRE_ORDER, getBookBySlug, slugFromDbName } from "@/lib/books";

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

/** DB の全 Book を取得し、空データと通信失敗を区別して返すフック。 */
export function useBookCatalogState(): {
  catalog: BookCatalogEntry[];
  loading: boolean;
  error: boolean;
  retry: () => void;
} {
  const [catalog, setCatalog] = useState<BookCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestKey, setRequestKey] = useState(0);
  const retry = useCallback(() => {
    setLoading(true);
    setError(false);
    setRequestKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    fetchBooks()
      .then((all) => {
        if (active) setCatalog(buildCatalog(all));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [requestKey]);
  return { catalog, loading, error, retry };
}

/** @deprecated New UI should use useBookCatalogState so failures remain recoverable. */
export function useBookCatalog(): BookCatalogEntry[] {
  return useBookCatalogState().catalog;
}

/** カタログから slug のエントリを返す。 */
export function catalogEntry(catalog: BookCatalogEntry[], slug: string): BookCatalogEntry | null {
  return catalog.find((e) => e.slug === slug) ?? null;
}

/** カタログをカテゴリ（ジャンル）別にまとめる。書選択の <select> を optgroup で先にカテゴリで
 *  絞るために使う。GENRE_ORDER 順・エントリのある genre だけ返す。 */
export function groupCatalogByGenre(
  catalog: BookCatalogEntry[],
): { genre: string; entries: BookCatalogEntry[] }[] {
  return GENRE_ORDER.map((genre) => ({
    genre,
    entries: catalog.filter((e) => getBookBySlug(e.slug)?.genre === genre),
  })).filter((g) => g.entries.length > 0);
}
