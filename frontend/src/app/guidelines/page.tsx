import { GuidelinesContent } from "./GuidelinesContent";
import { localizedPageMetadata } from "@/lib/serverLanguage";

export const generateMetadata = () => localizedPageMetadata({
  ja: { title: "コミュニティガイドライン · NeON Church", description: "異なる伝統を尊重しながら聖書と関連古代文書を議論するためのガイドラインです。" },
  en: { title: "Community Guidelines · NeON Church", description: "Community guidelines for NeON Church — how we discuss scripture and related ancient texts with respect for differing traditions." },
});

export default function GuidelinesPage() {
  return <GuidelinesContent />;
}
