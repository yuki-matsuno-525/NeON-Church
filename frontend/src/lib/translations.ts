// 訳の表示名と言語の登録簿。id は DB の Book.translation と一致させる。
//
// 「どの訳を選べるか」はここでは決めない。本文が入っているかどうかは DB にしか無く、
// 宣言だけ先に足した訳を候補に並べると、選んだ人がその訳の書を開けなくなるため、
// 候補はサーバー（/api/bible/translations/ と読書レスポンスの translations）が答える。
// ここが受け持つのは、受け取った id をどう表示するかだけ。

export const DEFAULT_TRANSLATION = "口語訳";

// 各訳の言語。本文がどの言語かを判定する唯一の定義元。
// grc = 古典/コイネー・ギリシャ語（原語）。UI 言語(ja/en)とは別軸。
const TRANSLATION_LANG: Record<string, "ja" | "en" | "grc" | "heb"> = {
  "口語訳": "ja",
  "KJV": "en",
  "Nestle 1904 (GRC)": "grc",
  "TR (GRC)": "grc",
  "LXX (GRC)": "grc",
  "WLC (HEB)": "heb",
  "文語訳": "ja",
  "R. H. Charles (EN)": "en",
  "Mark M. Mattison (EN)": "en",
  "L. S. A. Wells (EN)": "en",
  "Samuel Zinner (EN)": "en",
  "L. C. L. Brenton (EN)": "en",
};

// 訳 id → その訳の言語（ja/en/grc）。未知の id は ja 扱い。
export function translationLang(id: string): "ja" | "en" | "grc" | "heb" {
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
  "TR (GRC)": { ja: "公認本文（ギリシャ語）", en: "Textus Receptus (Greek)" },
  "LXX (GRC)": { ja: "七十人訳（ギリシャ語）", en: "Septuagint (Greek)" },
  "WLC (HEB)": { ja: "レニングラード写本（ヘブライ語）", en: "Leningrad Codex (Hebrew)" },
  "文語訳": { ja: "文語訳（日本語）", en: "Bungoyaku (Classical Japanese)" },
  "R. H. Charles (EN)": { ja: "Charles 訳（英語）", en: "R. H. Charles (English)" },
  "Mark M. Mattison (EN)": { ja: "Mattison 訳（英語）", en: "Mark M. Mattison (English)" },
  "L. S. A. Wells (EN)": { ja: "Wells 訳（英語）", en: "L. S. A. Wells (English)" },
  "Samuel Zinner (EN)": { ja: "Zinner 訳（英語）", en: "Samuel Zinner (English)" },
  "L. C. L. Brenton (EN)": { ja: "Brenton 訳・七十人訳から（英語）", en: "Brenton, from the Septuagint (English)" },
};

export function translationLabel(id: string, lang: string): string {
  const entry = TRANSLATION_LABELS[id];
  if (!entry) return id;
  return lang === "en" ? entry.en : entry.ja;
}
