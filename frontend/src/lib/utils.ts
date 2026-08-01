/**
 * 汎用ユーティリティ関数。
 * API 通信とは無関係な共通処理をここに置く。
 */

/**
 * ISO 8601 日時文字列を選択言語の相対表記に変換する。
 */
export function formatRelativeTime(dateStr: string, lang: "ja" | "en" = "ja"): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = (now.getTime() - date.getTime()) / 1000; // 秒

  if (diff < 60) return lang === "en" ? "just now" : "たった今";
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return lang === "en" ? `${minutes}m ago` : `${minutes}分前`;
  }
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return lang === "en" ? `${hours}h ago` : `${hours}時間前`;
  }
  if (diff < 86400 * 30) {
    const days = Math.floor(diff / 86400);
    return lang === "en" ? `${days}d ago` : `${days}日前`;
  }
  return date.toLocaleDateString(lang === "en" ? "en-US" : "ja-JP");
}
