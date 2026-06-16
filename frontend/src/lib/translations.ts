export type TranslationOption = {
  id: string;
  label: string;
};

// 既知の訳の登録簿。id は DB の Book.translation と一致させる。
export const BIBLE_TRANSLATIONS: TranslationOption[] = [
  { id: "口語訳", label: "口語訳" },
  { id: "KJV", label: "KJV（英語）" },
  { id: "R. H. Charles (EN)", label: "Charles（英語）" },
];

export const DEFAULT_TRANSLATION = "口語訳";

export function defaultTranslationForLang(lang: string): string {
  return lang === "en" ? "KJV" : "口語訳";
}

// 訳 id → 表示ラベル（UI 言語別）
const TRANSLATION_LABELS: Record<string, { ja: string; en: string }> = {
  "口語訳": { ja: "口語訳", en: "Japanese (Kogoyaku)" },
  "KJV": { ja: "KJV（英語）", en: "KJV (English)" },
  "R. H. Charles (EN)": { ja: "Charles（英語）", en: "Charles (English)" },
};

export function translationLabel(id: string, lang: string): string {
  const entry = TRANSLATION_LABELS[id];
  if (!entry) return id;
  return lang === "en" ? entry.en : entry.ja;
}
