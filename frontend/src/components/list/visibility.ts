/**
 * 記事・プランの公開範囲につけるバッジの class。
 *
 * 以前は各ページが「公開なら緑、それ以外は無彩色」と書いていたので、
 * 同じ「下書き」が記事では灰色、翻訳では黄色と、画面によって違っていた。
 * また 3 段階（下書き・限定公開・公開）あるのに 2 色しか無く、
 * 下書きと限定公開が見分けられなかった。
 *
 *   公開      … 緑（翻訳の「公開」と同じ）
 *   下書き    … 黄（翻訳の「下書き」と同じ）
 *   限定公開  … 無彩色。公開でも下書きでもない、という意味を色の無さで示す
 *
 * 色の値そのものは持たない。実際の色は styles/list.css の .tone-* にある。
 */
export function visibilityBadgeClass(visibility: "private" | "unlisted" | "public"): string {
  if (visibility === "public") return "badge badge-tone tone-ok";
  if (visibility === "private") return "badge badge-tone tone-wait";
  return "badge badge-muted";
}
