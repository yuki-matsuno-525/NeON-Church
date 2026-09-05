"use client";

import { useLang } from "@/contexts/LanguageContext";
import { getBookBySlug } from "@/lib/books";
import { translations, type Translations } from "@/lib/i18nDictionary";
import { bookLabel, formatBookLocation, relativeTime } from "@/lib/i18nFormat";

// 辞書そのものは i18nDictionary.ts、文字の組み立ては i18nFormat.ts にある
// （どちらもサーバー側から読めるようにするため）。ここは表示言語に合わせて
// 辞書を選ぶフックだけを持ち、残りはそのまま通す。
export { translations };
export type { Translations };
export { bookLabel, formatBookLocation, relativeTime };

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

export function useRelativeTime(): (dateStr: string) => string {
  const t = useT();
  return (dateStr: string) => relativeTime(dateStr, t);
}
