/**
 * 汎用ユーティリティ関数。
 * API 通信とは無関係な共通処理をここに置く。
 */

/**
 * ISO 8601 日時文字列を「N分前」などの相対表記に変換する。
 * 30日以上前の場合は ja-JP のロケールで日付を返す。
 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = (now.getTime() - date.getTime()) / 1000; // 秒

  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}日前`;
  return date.toLocaleDateString("ja-JP");
}
