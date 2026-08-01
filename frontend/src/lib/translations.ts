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
  { id: "TR (GRC)" },
  { id: "LXX (GRC)" },
  { id: "WLC (HEB)" },
  { id: "文語訳" },
  { id: "R. H. Charles (EN)" },
  { id: "Mark M. Mattison (EN)" },
  { id: "L. S. A. Wells (EN)" },
  { id: "Samuel Zinner (EN)" },
  { id: "L. C. L. Brenton (EN)" },
];

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

// 訳 id → ライセンスと出典。ライセンスは訳ごとの性質（Brenton 訳は常にパブリックドメイン）
// なので、書ではなく訳に持たせる。ある書のライセンスは、その書が持つ訳のライセンス。
//
// 収録している訳は現在すべてパブリックドメインだが、そうでない訳が将来入りうるので
// 訳ごとに持つ。license は表示用の文言ではなく種別を表す（表示は licenseLabel が担う）。
//
// 出典はバックエンドの importer が持つ SOURCE 定数と、bible/seed/ibibles/README.md に対応する。
type TranslationInfo = { license: "public-domain"; source: string };

const TRANSLATION_INFO: Record<string, TranslationInfo> = {
  "口語訳": { license: "public-domain", source: "日本聖書協会 1955 / ibibles.net" },
  "KJV": { license: "public-domain", source: "King James Version 1611（1769 改訂）/ ibibles.net" },
  "Nestle 1904 (GRC)": { license: "public-domain", source: "Nestle 1904 / biblicalhumanities.org（OSIS XML）" },
  "TR (GRC)": { license: "public-domain", source: "Textus Receptus / ibibles.net" },
  "LXX (GRC)": { license: "public-domain", source: "Septuagint / ibibles.net" },
  "WLC (HEB)": { license: "public-domain", source: "Leningrad Codex 系 / ibibles.net" },
  "文語訳": { license: "public-domain", source: "文語訳（明治・大正）/ ibibles.net" },
  "R. H. Charles (EN)": { license: "public-domain", source: "R. H. Charles 1917 / Project Gutenberg" },
  "Mark M. Mattison (EN)": { license: "public-domain", source: "Mark M. Mattison / gospels.net" },
  "L. S. A. Wells (EN)": { license: "public-domain", source: "L. S. A. Wells（R. H. Charles 編）/ sacred-texts.com" },
  "Samuel Zinner (EN)": { license: "public-domain", source: "Samuel Zinner / gospels.net" },
  "L. C. L. Brenton (EN)": { license: "public-domain", source: "L. C. L. Brenton 1851 / eBible.org" },
};

const LICENSE_LABELS: Record<TranslationInfo["license"], { ja: string; en: string }> = {
  "public-domain": { ja: "パブリックドメイン", en: "Public domain" },
};

/** 訳 id → ライセンス種別。未知の訳は null（表示側で出さない）。 */
export function translationLicense(id: string): TranslationInfo["license"] | null {
  return TRANSLATION_INFO[id]?.license ?? null;
}

/** 訳 id → 出典（訳者・底本・入手元）。未知の訳は null。 */
export function translationSource(id: string): string | null {
  return TRANSLATION_INFO[id]?.source ?? null;
}

export function licenseLabel(license: TranslationInfo["license"], lang: string): string {
  const entry = LICENSE_LABELS[license];
  return lang === "en" ? entry.en : entry.ja;
}

/**
 * その書のライセンス。持っている訳すべてが同じライセンスならそれを、
 * 混在していれば null を返す（1つの札で言い切れないため表示しない）。
 */
export function licenseForTranslations(ids: readonly string[], ): TranslationInfo["license"] | null {
  const licenses = ids.map(translationLicense);
  if (licenses.length === 0 || licenses.some((l) => l === null)) return null;
  return licenses.every((l) => l === licenses[0]) ? licenses[0] : null;
}
