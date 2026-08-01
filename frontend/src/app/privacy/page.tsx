import { PrivacyContent } from "./PrivacyContent";
import { localizedPageMetadata } from "@/lib/serverLanguage";

export const generateMetadata = () => localizedPageMetadata({
  ja: { title: "プライバシーポリシー · NeON Church", description: "NeON Churchが収集するデータ、利用方法、利用者の権利について説明します。" },
  en: { title: "Privacy Policy · NeON Church", description: "Privacy policy for NeON Church — what data we collect, how we use it, and your rights." },
});

export default function PrivacyPage() {
  return <PrivacyContent />;
}
