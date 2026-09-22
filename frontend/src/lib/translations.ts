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

/** 表示名と言語を登録してある訳 id の一覧 */
export const KNOWN_TRANSLATIONS = Object.keys(TRANSLATION_LANG);

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

// 訳 id → 出典（何の本文か・権利の状態・どこから取ったか）。
// ライセンスページの一覧表と、読書画面の本文下の1行はどちらもここを読む。
// 訳を足したら、ここにも必ず1行足すこと（無いとライセンスページに載らない）。
type Bilingual = { ja: string; en: string };
export type TranslationSource = {
  /** 底本・訳者・年 */
  work: Bilingual;
  /** 権利の状態 */
  license: Bilingual;
  /** 入手元 */
  origin: { name: string; url: string };
  /** 表示のときに添える注意。無ければ省く */
  note?: Bilingual;
};

const PD: Bilingual = { ja: "パブリックドメイン", en: "Public domain" };

const TRANSLATION_SOURCES: Record<string, TranslationSource> = {
  "口語訳": {
    work: { ja: "口語訳聖書（日本聖書協会 1954年・1955年 初版）", en: "Japanese Colloquial Bible (Japan Bible Society, 1954/1955 first edition)" },
    license: { ja: "パブリックドメイン（日本の著作権保護期間満了）", en: "Public domain (copyright term expired in Japan)" },
    origin: { name: "ibibles.net", url: "https://www.ibibles.net/" },
    note: {
      ja: "初版の本文を改変せずに掲載しています。今日では不適切とされる表現が含まれますが、歴史的な本文としてそのまま収録しています。",
      en: "The first-edition text is reproduced without alteration. It contains expressions now considered inappropriate, kept as part of the historical text.",
    },
  },
  "文語訳": {
    work: { ja: "『舊新約聖書』（文語訳）日本聖書協会 1887年・1917年", en: "Japanese Literary Bible (Bungoyaku), Japan Bible Society, 1887/1917" },
    license: PD,
    origin: { name: "ibibles.net", url: "https://www.ibibles.net/" },
  },
  "KJV": {
    work: { ja: "欽定訳聖書（King James Version, 1769年版）", en: "King James Version (1769 edition)" },
    license: { ja: "パブリックドメイン（英国内では王室の特許の対象）", en: "Public domain (outside the UK, where it is under Crown patent)" },
    origin: { name: "ibibles.net", url: "https://www.ibibles.net/" },
  },
  "TR (GRC)": {
    work: { ja: "公認本文 Textus Receptus（Scrivener 1894）", en: "Textus Receptus (Scrivener 1894)" },
    license: PD,
    origin: { name: "ibibles.net", url: "https://www.ibibles.net/" },
  },
  "Nestle 1904 (GRC)": {
    work: { ja: "Nestle 1904 ギリシャ語新約聖書", en: "Nestle 1904 Greek New Testament" },
    license: {
      ja: "本文はパブリックドメイン。電子データ（マークアップ）は Jonathan Robie / biblicalhumanities.org による CC BY-SA 4.0",
      en: "Text: public domain. Digital markup by Jonathan Robie / biblicalhumanities.org, CC BY-SA 4.0",
    },
    origin: { name: "biblicalhumanities/Nestle1904", url: "https://github.com/biblicalhumanities/Nestle1904" },
  },
  "LXX (GRC)": {
    work: { ja: "七十人訳ギリシャ語旧約聖書（Rahlfs 1935 系）", en: "Septuagint (based on Rahlfs 1935)" },
    license: PD,
    origin: { name: "ibibles.net", url: "https://www.ibibles.net/" },
  },
  "WLC (HEB)": {
    work: { ja: "ウェストミンスター・レニングラード写本（WLC）", en: "Westminster Leningrad Codex (WLC)" },
    license: {
      ja: "本文はパブリックドメイン（J. Alan Groves Center 提供に感謝します）",
      en: "Text: public domain (with thanks to the J. Alan Groves Center)",
    },
    origin: { name: "ibibles.net", url: "https://www.ibibles.net/" },
  },
  "L. C. L. Brenton (EN)": {
    work: { ja: "L. C. L. Brenton 訳・七十人訳英訳（1851年）", en: "L. C. L. Brenton, The Septuagint in English (1851)" },
    license: PD,
    origin: { name: "eBible.org", url: "https://ebible.org/eng-Brenton/" },
  },
  "Mark M. Mattison (EN)": {
    work: { ja: "Mark M. Mattison 訳", en: "Translated by Mark M. Mattison" },
    license: { ja: "パブリックドメイン（訳者による提供）", en: "Public domain (dedicated by the translator)" },
    origin: { name: "Gospels.net", url: "https://www.gospels.net/" },
  },
  "Samuel Zinner (EN)": {
    work: { ja: "Samuel Zinner 訳", en: "Translated by Samuel Zinner" },
    license: { ja: "パブリックドメイン（訳者による提供）", en: "Public domain (dedicated by the translator)" },
    origin: { name: "Gospels.net", url: "https://www.gospels.net/secret-gospel-of-mark" },
  },
  "L. S. A. Wells (EN)": {
    work: { ja: "L. S. A. Wells 訳（R. H. Charles 編『旧約外典偽典』1913年）", en: "L. S. A. Wells, in R. H. Charles (ed.), The Apocrypha and Pseudepigrapha of the Old Testament (1913)" },
    license: PD,
    origin: { name: "sacred-texts.com", url: "https://sacred-texts.com/chr/apo/adamnev.htm" },
  },
  "R. H. Charles (EN)": {
    work: { ja: "R. H. Charles 訳『エノク書』（SPCK, 1917年）", en: "R. H. Charles, The Book of Enoch (SPCK, 1917)" },
    license: PD,
    origin: { name: "Project Gutenberg", url: "https://www.gutenberg.org/ebooks/77935" },
  },
};

/** 出典が登録されている訳 id の一覧（ライセンスページの表の並び順） */
export const SOURCED_TRANSLATIONS = Object.keys(TRANSLATION_SOURCES);

export function translationSource(id: string): TranslationSource | null {
  return TRANSLATION_SOURCES[id] ?? null;
}
