import type { ArticleVisibility } from "./types";

/** 公開範囲の日本語ラベル。画面に英語の private/public を出さないための変換。 */
export function visibilityLabel(visibility: ArticleVisibility): string {
  if (visibility === "public") return "公開";
  if (visibility === "unlisted") return "限定公開";
  return "下書き";
}

export const VISIBILITY_OPTIONS: { value: ArticleVisibility; label: string; help: string }[] = [
  { value: "private", label: "下書き", help: "自分だけが見られます。" },
  { value: "unlisted", label: "限定公開", help: "一覧には出ませんが、URLを知っている人は読めます。" },
  { value: "public", label: "公開", help: "誰でも読めて、一覧にも出ます。" },
];
