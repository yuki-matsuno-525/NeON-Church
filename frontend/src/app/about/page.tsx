import { AboutContent } from "./AboutContent";
import { localizedPageMetadata } from "@/lib/serverLanguage";

export const generateMetadata = () => localizedPageMetadata({
  ja: { title: "NeON Churchについて", description: "無教会主義、ポストモダン思想、正典外文書をつなぎ、テキストと解釈が交差する新しいキリスト教プラットフォームです。" },
  en: { title: "About NeON Church", description: "NeON Church is a new Christian platform where texts and interpretations intersect — bridging Non-Church Christianity, postmodern thought, and texts placed outside the canon." },
});

export default function AboutPage() {
  return <AboutContent />;
}
