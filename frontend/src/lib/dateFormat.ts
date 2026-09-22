/**
 * 日付・日時を文字にする。どこで組み立てても同じ文字になるよう、時間帯を固定する。
 *
 * 時間帯を決めずに toLocaleDateString を呼ぶと、サーバー（UTC）とブラウザ（日本なら JST）で
 * 日付が 1 日ずれることがある。サーバーで描いた画面をブラウザが引き継ぐとき
 * （ハイドレーション）に文字が食い違い、エラーになる。
 * このサイトは東京を舞台にしているので、表示は東京の時刻にそろえる。
 */
export const DISPLAY_TIME_ZONE = "Asia/Tokyo";

/** 日付だけ（例: 2026/5/30）。options で書き方を変えられる。 */
export function formatDate(
  value: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Date(value).toLocaleDateString(locale, { ...options, timeZone: DISPLAY_TIME_ZONE });
}

/** 日付と時刻（例: 2026/5/30 9:15:00）。options で書き方を変えられる。 */
export function formatDateTime(
  value: string | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: DISPLAY_TIME_ZONE }).format(new Date(value));
}
