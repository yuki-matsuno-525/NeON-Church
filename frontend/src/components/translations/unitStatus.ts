import type { Translations } from "@/lib/i18nDictionary";

/** ユニットの状態バッジの色。背景と文字色だけを画面側から渡す。 */
export const STATUS_BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  todo:        { bg: "var(--bg-hover)",       color: "var(--text-muted)"    },
  in_progress: { bg: "var(--accent-tint)",    color: "var(--accent)"        },
  review:      { bg: "rgba(245,158,11,0.15)", color: "var(--state-warning)" },
  done:        { bg: "rgba(34,197,94,0.15)",  color: "var(--state-success)" },
};

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
