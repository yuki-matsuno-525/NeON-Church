export type TranslationOption = {
  id: string;
  label: string;
};

// 既知の訳の登録簿。id は DB の Book.translation と一致させる。
// 表示ラベルは UI 言語別に TRANSLATION_LABELS で一元管理する（ここでは id のみ持つ）。
export const BIBLE_TRANSLATIONS: { id: string }[] = [
  { id: "口語訳" },
  { id: "KJV" },
  { id: "Nestle 1904 (GRC)" },
  { id: "R. H. Charles (EN)" },
  { id: "Mark M. Mattison (EN)" },
  { id: "L. S. A. Wells (EN)" },
];

export const DEFAULT_TRANSLATION = "口語訳";

// 各訳の言語。本文がどの言語かを判定する唯一の定義元。
// grc = 古典/コイネー・ギリシャ語（原語）。UI 言語(ja/en)とは別軸。
const TRANSLATION_LANG: Record<string, "ja" | "en" | "grc"> = {
  "口語訳": "ja",
  "KJV": "en",
  "Nestle 1904 (GRC)": "grc",
  "R. H. Charles (EN)": "en",
  "Mark M. Mattison (EN)": "en",
  "L. S. A. Wells (EN)": "en",
};

// 訳 id → その訳の言語（ja/en/grc）。未知の id は ja 扱い。
export function translationLang(id: string): "ja" | "en" | "grc" {
  return TRANSLATION_LANG[id] ?? "ja";
}

export function defaultTranslationForLang(lang: string): string {
  return lang === "en" ? "KJV" : "口語訳";
}

// 訳 id → 表示ラベル（UI 言語別）。各訳の言語が一目で分かる表記にする。
const TRANSLATION_LABELS: Record<string, { ja: string; en: string }> = {
  "口語訳": { ja: "口語訳（日本語）", en: "Kōgoyaku (Japanese)" },
  "KJV": { ja: "KJV（英語）", en: "KJV (English)" },
  "Nestle 1904 (GRC)": { ja: "ネストレ1904（ギリシャ語）", en: "Nestle 1904 (Greek)" },
  "R. H. Charles (EN)": { ja: "Charles 訳（英語）", en: "R. H. Charles (English)" },
  "Mark M. Mattison (EN)": { ja: "Mattison 訳（英語）", en: "Mark M. Mattison (English)" },
  "L. S. A. Wells (EN)": { ja: "Wells 訳（英語）", en: "L. S. A. Wells (English)" },
};

export function translationLabel(id: string, lang: string): string {
  const entry = TRANSLATION_LABELS[id];
  if (!entry) return id;
  return lang === "en" ? entry.en : entry.ja;
}
