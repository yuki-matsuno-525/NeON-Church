/**
 * 記事・プランの公開範囲につけるバッジの class。
 *
 * 以前は各ページが「公開なら緑、それ以外は無彩色」と書いていたので、
 * 同じ「下書き」が記事では灰色、翻訳では黄色と、画面によって違っていた。
 *
 *   公開      … 緑（翻訳の「公開」と同じ）
 *   下書き    … 黄（翻訳の「下書き」と同じ）
 *
 * 色の値そのものは持たない。実際の色は styles/list.css の .tone-* にある。
 */
export function visibilityBadgeClass(visibility: "private" | "public"): string {
  return visibility === "public" ? "badge badge-tone tone-ok" : "badge badge-tone tone-wait";
}
