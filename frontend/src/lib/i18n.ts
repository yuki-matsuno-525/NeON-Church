"use client";

import { useCallback, useSyncExternalStore } from "react";

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

const CLOCK_REFRESH_MS = 60_000;
const clockListeners = new Set<() => void>();
let clockSnapshot = Date.now();
let clockInterval: ReturnType<typeof setInterval> | undefined;

function updateClock() {
  clockSnapshot = Date.now();
  clockListeners.forEach((listener) => listener());
}

function subscribeToClock(listener: () => void) {
  clockListeners.add(listener);

  if (clockListeners.size === 1) {
    clockSnapshot = Date.now();
    clockInterval = setInterval(updateClock, CLOCK_REFRESH_MS);
  }

  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockInterval !== undefined) {
      clearInterval(clockInterval);
      clockInterval = undefined;
    }
  };
}

function getClockSnapshot() {
  return clockSnapshot;
}

function getServerClockSnapshot() {
  return null;
}

function useClock(): number | null {
  return useSyncExternalStore(subscribeToClock, getClockSnapshot, getServerClockSnapshot);
}

export function useRelativeTime(): (dateStr: string) => string {
  const t = useT();
  const now = useClock();
  return useCallback((dateStr: string) => relativeTime(dateStr, t, now), [now, t]);
}

/** 相対時刻部品で使う、hydration-safe な表示文字列とツールチップ。 */
export function useRelativeTimeDisplay(dateStr: string): { label: string; title: string } {
  const t = useT();
  const now = useClock();
  return {
    label: relativeTime(dateStr, t, now),
    // 初回は逐語的な入力を共有し、hydration 後は従来どおり閲覧環境の日時にする。
    title: now === null ? dateStr : new Date(dateStr).toLocaleString(),
  };
}
