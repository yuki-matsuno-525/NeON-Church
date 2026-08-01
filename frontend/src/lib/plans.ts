import type { PlanVisibility } from "./types";

/** 公開範囲の日本語ラベル。画面に英語の private/public を出さないための変換。 */
export function visibilityLabel(visibility: PlanVisibility): string {
  if (visibility === "public") return "公開";
  if (visibility === "unlisted") return "限定公開";
  return "下書き";
}

export const VISIBILITY_OPTIONS: { value: PlanVisibility; label: string }[] = [
  { value: "private", label: "下書き" },
  { value: "unlisted", label: "限定公開" },
  { value: "public", label: "公開" },
];

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
