import type { Translations } from "@/lib/i18nDictionary";
import { toneClass, type Tone } from "@/components/list/tone";

/** ユニットの状態と、それを表す分類の色。色の値は list.css の tone-* が持つ。 */
const UNIT_STATUS_TONE: Record<string, Tone> = {
  in_progress: "active",
  review: "wait",
  done: "ok",
};

/** 状態バッジに付ける class。決まっていない状態は控えめな色にする。 */
export function unitStatusBadgeClass(status: string): string {
  const tone = UNIT_STATUS_TONE[status];
  return tone ? `badge badge-tone ${toneClass(tone)}` : "badge badge-muted";
}

/** 参加申請の状態バッジに付ける class。 */
export function memberStatusBadgeClass(status: string): string {
  const tone: Tone = status === "approved" ? "ok" : status === "pending" ? "wait" : "ng";
  return `badge badge-tone ${toneClass(tone)}`;
}

/** ユニットの状態の表示名。 */
export function unitStatusLabel(status: string, t: Translations): string {
  if (status === "todo") return t.statusPending;
  if (status === "in_progress") return t.statusInProgress;
  if (status === "review") return t.statusInReview;
  if (status === "done") return t.statusDone;
  return status;
}

/** 参加申請の状態の表示名。 */
export function memberStatusLabel(status: string, t: Translations): string {
  if (status === "approved") return t.statusApproved;
  if (status === "pending") return t.statusPendingApproval;
  return t.statusRejected;
}
