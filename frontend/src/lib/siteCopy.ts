export type SiteLang = "ja" | "en";

export const siteCopy = {
  ja: {
    description: "制度としての教会ではなく、テキストと解釈が交差する開かれた場。あらゆるテキストを隔てなく読み、議論し、翻訳する。",
    socialDescription: "テキストと解釈が交差する開かれた場。あらゆるテキストを隔てなく読む。",
    notFoundMetadata: "404 — ページが見つかりません",
    notFoundTitle: "ページが見つかりません",
    notFoundDescription: "お探しのページは移動または削除された可能性があります。",
    notFoundHome: "ホームへ戻る",
  },
  en: {
    description: "Not a church as an institution, but an open field where texts and interpretations intersect. Read, discuss, and translate every text, without ranking one above another.",
    socialDescription: "An open field where texts and interpretations intersect — every text read on equal footing.",
    notFoundMetadata: "404 — Page Not Found",
    notFoundTitle: "Page Not Found",
    notFoundDescription: "The page you're looking for may have been moved or deleted.",
    notFoundHome: "Back to Home",
  },
} as const;
