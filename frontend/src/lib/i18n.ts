"use client";

import { useLang } from "@/contexts/LanguageContext";
import { getBookBySlug } from "@/lib/books";
import { BIBLE_TRANSLATIONS, translationLabel } from "@/lib/translations";
import { translations, type Translations } from "@/lib/i18nDictionary";

// 辞書そのものは i18nDictionary.ts にある（サーバー側からも読めるようにするため）。
// ここは表示言語に合わせて辞書を選ぶフックだけを持つ。
export { translations };
export type { Translations };

export function useT(): Translations {
  const { lang } = useLang();
  return translations[lang] ?? translations.ja;
}

export function useBookLabel(slug: string): { name: string; short: string } | null {
  const { lang } = useLang();
  const b = getBookBySlug(slug);
  if (!b) return null;
  return lang === "en"
    ? { name: b.englishName, short: b.englishName }
    : { name: b.name, short: b.short };
}

export function bookLabel(slug: string, lang: string): { name: string; short: string } | null {
  const b = getBookBySlug(slug);
  if (!b) return null;
  return lang === "en"
    ? { name: b.englishName, short: b.englishName }
    : { name: b.name, short: b.short };
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

// 全訳の一覧（翻訳プロジェクトの元訳選択など、本に依らない場面で使う）。
export function useTranslationOptions(): { id: string; label: string }[] {
  const { lang } = useLang();
  return BIBLE_TRANSLATIONS.map((tr) => ({ id: tr.id, label: translationLabel(tr.id, lang) }));
}

export function useRelativeTime(): (dateStr: string) => string {
  const t = useT();
  return (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return t.relJustNow;
    if (diff < 3600) return t.relMinutesAgo(Math.floor(diff / 60));
    if (diff < 86400) return t.relHoursAgo(Math.floor(diff / 3600));
    if (diff < 86400 * 30) return t.relDaysAgo(Math.floor(diff / 86400));
    return new Date(dateStr).toLocaleDateString(t.dateLocale);
  };
}
