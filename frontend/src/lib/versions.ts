// 「同じ箇所の全バージョン（口語訳・KJV・英訳など）」の id 解決。
//
// 箇所は canonical_book.slug で表される。backend の /references/<slug>/... エンドポイントが
// その箇所に存在する各版の 書id / 章id / 節id を1回でまとめて返す（旧実装の N+1 を解消）。
// 「すべてのバージョンのコメントを表示」で、集めた id をまとめてコメント取得するために使う。

import {
  fetchReferenceBooks,
  fetchReferenceChapters,
  fetchReferenceVerses,
} from "@/lib/api";
import { BOOKS } from "@/lib/books";

// 同じ取得を繰り返さないためのセッション内キャッシュ。
const bookIdsCache = new Map<string, string[]>();
const chapterIdsCache = new Map<string, string[]>();
const verseIdsCache = new Map<string, string[]>();

/** 翻訳の元の書名（DB の Book.name）から、対応する slug を逆引きする。無ければ null。 */
export function findSlugByBookName(name: string): string | null {
  const hit = BOOKS.find((b) => b.translations.some((tr) => tr.name === name));
  return hit?.slug ?? null;
}

/** この書の全バージョンの「書id」を返す。 */
export async function resolveVersionBookIds(slug: string): Promise<string[]> {
  const cached = bookIdsCache.get(slug);
  if (cached) return cached;
  let ids: string[] = [];
  try {
    ids = (await fetchReferenceBooks(slug)).map((b) => b.id);
  } catch {
    // 取得できなくても画面は動かす（空で返す）
  }
  bookIdsCache.set(slug, ids);
  return ids;
}

/** この書の全バージョンの、指定章番号にあたる「章id」を返す。 */
export async function resolveVersionChapterIds(slug: string, chapterNumber: number): Promise<string[]> {
  const key = `${slug}:${chapterNumber}`;
  const cached = chapterIdsCache.get(key);
  if (cached) return cached;
  let ids: string[] = [];
  try {
    ids = (await fetchReferenceChapters(slug, chapterNumber)).map((c) => c.id);
  } catch {
    // スキップ
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
  let ids: string[] = [];
  try {
    ids = (await fetchReferenceVerses(slug, chapterNumber, verseNumber)).map((v) => v.id);
  } catch {
    // スキップ
  }
  verseIdsCache.set(key, ids);
  return ids;
}
