export type TranslationOption = {
  id: string;
  label: string;
};

export const BIBLE_TRANSLATIONS: TranslationOption[] = [
  { id: "口語訳", label: "口語訳" },
  { id: "KJV", label: "KJV（英語）" },
];

export const DEFAULT_TRANSLATION = "口語訳";

export function defaultTranslationForLang(lang: string): string {
  return lang === "en" ? "KJV" : "口語訳";
}
