/**
 * 一覧やバッジの「分類の色」。色の値そのものは持たず、CSS の class 名だけを持つ。
 * 実際の色は src/styles/list.css の .tone-* にある。
 *
 *   ok     … 済み・公開（緑）
 *   active … 進行中（紫）
 *   wait   … 待ち・下書き（黄）
 *   ng     … 断られた・失敗（赤）
 */
export type Tone = "ok" | "active" | "wait" | "ng";

/** `tone-ok` のような class 名にする。 */
export function toneClass(tone: Tone): string {
  return `tone-${tone}`;
}
