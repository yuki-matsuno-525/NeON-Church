import { TermsContent } from "./TermsContent";
import { localizedPageMetadata } from "@/lib/serverLanguage";

export const generateMetadata = () => localizedPageMetadata({
  ja: { title: "利用規約 · NeON Church", description: "あらゆる古代文書を共同で読むNeON Churchの利用規約です。" },
  en: { title: "Terms of Service · NeON Church", description: "Terms of service for NeON Church — a collaborative reader for the ancient texts, every one of them." },
});

export default function TermsPage() {
  return <TermsContent />;
}
