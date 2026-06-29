// 「同じ箇所の全バージョン（口語訳・KJV・英訳など）」のid解決。
//
// どの訳が同じ書かは books.ts の translations 配列（DBの Book.name 対応表）だけが知っている。
// ここでは slug を起点に、各訳の 書id / 章id / 節id を集めて返す。
// 「すべてのバージョンのコメントを表示」で、集めたidをまとめてコメント取得するために使う。

import { fetchBooks, fetchChapters, fetchVerses } from "@/lib/api";
import { BOOKS, getBookBySlug } from "@/lib/books";

// 同じ取得を繰り返さないためのセッション内キャッシュ。
const bookIdsCache = new Map<string, string[]>();
const chapterIdsCache = new Map<string, string[]>();
const verseIdsCache = new Map<string, string[]>();

/** 翻訳の元の書名（DBの Book.name）から、対応する slug を逆引きする。無ければ null。 */
export function findSlugByBookName(name: string): string | null {
  const hit = BOOKS.find((b) => b.translations.some((tr) => tr.name === name));
  return hit?.slug ?? null;
}

/** この書の全バージョンの「書id」を返す。 */
export async function resolveVersionBookIds(slug: string): Promise<string[]> {
  const cached = bookIdsCache.get(slug);
  if (cached) return cached;
  const meta = getBookBySlug(slug);
  if (!meta) return [];
  const ids: string[] = [];
  for (const tr of meta.translations) {
    try {
      const books = await fetchBooks(tr.id);
      const book = books.find((b) => b.name === tr.name);
      if (book) ids.push(book.id);
    } catch {
      // この訳が取得できなくても他の訳は集める
    }
  }
  bookIdsCache.set(slug, ids);
  return ids;
}

/** この書の全バージョンの、指定章番号にあたる「章id」を返す。 */
export async function resolveVersionChapterIds(slug: string, chapterNumber: number): Promise<string[]> {
  const key = `${slug}:${chapterNumber}`;
  const cached = chapterIdsCache.get(key);
  if (cached) return cached;
  const bookIds = await resolveVersionBookIds(slug);
  const ids: string[] = [];
  for (const bookId of bookIds) {
    try {
      const chapters = await fetchChapters(bookId);
      const ch = chapters.find((c) => c.number === chapterNumber);
      if (ch) ids.push(ch.id);
    } catch {
      // スキップ
    }
  }
  chapterIdsCache.set(key, ids);
  return ids;
}

/** この書の全バージョンの、指定章・節番号にあたる「節id」を返す。 */
export async function resolveVersionVerseIds(
  slug: string,
  chapterNumber: number,
  verseNumber: number,
): Promise<string[]> {
  const key = `${slug}:${chapterNumber}:${verseNumber}`;
  const cached = verseIdsCache.get(key);
  if (cached) return cached;
  const chapterIds = await resolveVersionChapterIds(slug, chapterNumber);
  const ids: string[] = [];
  for (const chapterId of chapterIds) {
    try {
      const verses = await fetchVerses(chapterId);
      const v = verses.find((vv) => vv.number === verseNumber);
      if (v) ids.push(v.id);
    } catch {
      // スキップ
    }
  }
  verseIdsCache.set(key, ids);
  return ids;
}
