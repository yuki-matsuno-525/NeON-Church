import { LicensesContent } from "./LicensesContent";
import { localizedPageMetadata } from "@/lib/serverLanguage";

export const generateMetadata = () => localizedPageMetadata({
  ja: { title: "ライセンス · NeON Church", description: "NeON Churchで使用する聖書本文、投稿翻訳、ソースコード、素材のライセンス情報です。" },
  en: { title: "Licenses · NeON Church", description: "Licensing information for scripture texts, user-submitted translations, source code, and assets used by NeON Church." },
});

export default function LicensesPage() {
  return <LicensesContent />;
}
