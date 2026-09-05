// 表示言語に合わせて文字を組み立てるところ。受け取った値から文字を作るだけで、
// 画面の状態には触らない。そのためサーバー側で組み立てる画面からも呼べる
// （"use client" が付いている i18n.ts からは、これらを再輸出している）。

import { getBookBySlug } from "@/lib/books";
import { translations, type Translations } from "@/lib/i18nDictionary";

export function bookLabel(slug: string, lang: string): { name: string; short: string } | null {
  const book = getBookBySlug(slug);
  if (!book) return null;
  return lang === "en"
    ? { name: book.englishName, short: book.englishName }
    : { name: book.name, short: book.short };
}

// 箇所（slug/章/節）を表示言語の書名でラベル化する（例: "マタイ 1章1節"）。
// バックエンドの location_label は投稿時訳の書名（ギリシャ語名など）で出るため、
// 表示側ではこのヘルパーで UI 言語の書名に揃える。
export function formatBookLocation(
  slug: string,
  chapter: number | null,
  verse: number | null,
  lang: string,
): string {
  const t = translations[lang] ?? translations.ja;
  const name = bookLabel(slug, lang)?.name ?? slug;
  if (chapter != null && verse != null) return `${name} ${t.verseFmt(chapter, verse)}`;
  if (chapter != null) return `${name} ${t.chapterFmt(chapter)}`;
  return name;
}

function hydrationSafeDate(date: Date, t: Translations): string {
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(t.dateLocale, { timeZone: "UTC" });
}

/**
 * 「3分前」のような相対時刻。1か月以上前は日付にする。
 *
 * referenceTime を明示すると、呼び出し側の時計を入力として扱う純粋な変換になる。
 * null は SSR と hydration の初回描画で共有する、環境に依存しない日付表示を表す。
 */
export function relativeTime(
  dateStr: string,
  t: Translations,
  referenceTime: number | null = Date.now(),
): string {
  const date = new Date(dateStr);
  if (referenceTime === null) return hydrationSafeDate(date, t);

  const diff = (referenceTime - date.getTime()) / 1000;
  if (diff < 60) return t.relJustNow;
  if (diff < 3600) return t.relMinutesAgo(Math.floor(diff / 60));
  if (diff < 86400) return t.relHoursAgo(Math.floor(diff / 3600));
  if (diff < 86400 * 30) return t.relDaysAgo(Math.floor(diff / 86400));
  return date.toLocaleDateString(t.dateLocale);
}
