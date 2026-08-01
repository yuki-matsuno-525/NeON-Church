import type { PlanVisibility } from "./types";
import type { Translations } from "./i18n";

/** 公開範囲のラベル。画面に英語の private/public を出さないための変換。 */
export function visibilityLabel(visibility: PlanVisibility, t: Translations): string {
  if (visibility === "public") return t.visibilityPublic;
  if (visibility === "unlisted") return t.visibilityUnlisted;
  return t.visibilityPrivate;
}

export function visibilityOptions(t: Translations): { value: PlanVisibility; label: string }[] {
  return [
    { value: "private", label: t.visibilityPrivate },
    { value: "unlisted", label: t.visibilityUnlisted },
    { value: "public", label: t.visibilityPublic },
  ];
}

/** 1日に入れられる章の上限（backend の MAX_READINGS_PER_DAY と合わせる）。 */
export const MAX_READINGS_PER_DAY = 10;

/**
 * 始めた日から数えて「今日は何日目か」。
 * プラン側は日付を持たず「第N日」の番号だけを持つので、ここで日付に変換する。
 */
export function dayNumberToday(startedAt: string): number {
  const started = new Date(startedAt);
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const elapsed = startOfDay(new Date()) - startOfDay(started);
  return Math.floor(elapsed / 86_400_000) + 1;
}
