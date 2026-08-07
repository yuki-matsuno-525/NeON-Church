// 「書（slug）→ その書が持つ訳 → DB の Book id」を引くためのカタログ。
// DB の Book は (name, translation) 単位で別 id を持つ。QA / Translate では
// まず書（slug）を選び、次にその書が持つ訳（バージョン）を選ばせるため、
// slug ごとに「訳 id → DB Book id」をまとめておく。
//
// ここは受け取った一覧を組み替えるだけで、取りに行く処理を持たない。
// そのためサーバー側で組み立てる画面からもそのまま呼べる
// （ブラウザ側で取りに行くほうは hooks/useBookCatalog.ts）。

import { BOOKS, GENRE_ORDER, getBookBySlug, slugFromDbName } from "@/lib/books";
import type { Book } from "@/lib/api";

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

/** カタログから slug のエントリを返す。 */
export function catalogEntry(catalog: BookCatalogEntry[], slug: string): BookCatalogEntry | null {
  return catalog.find((e) => e.slug === slug) ?? null;
}

/**
 * 書と訳から、絞り込みに使う DB Book id を決める。
 *
 * 訳を選んでいなければ、その書の全訳 id をカンマ区切りで返す（＝書だけで絞る）。
 * 書も選んでいなければ undefined（＝絞らない）。
 */
export function catalogBookIdParam(
  catalog: BookCatalogEntry[],
  slug: string,
  version: string,
): string | undefined {
  const entry = slug ? catalogEntry(catalog, slug) : null;
  if (!entry) return undefined;
  if (version) return entry.translations.find((tr) => tr.id === version)?.bookId;
  return entry.translations.map((tr) => tr.bookId).join(",");
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
