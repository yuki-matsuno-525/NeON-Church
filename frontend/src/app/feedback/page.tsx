import { FeedbackContent } from "./FeedbackContent";
import { localizedPageMetadata } from "@/lib/serverLanguage";

export const generateMetadata = () => localizedPageMetadata({
  ja: { title: "フィードバック · NeON Church", description: "NeON Churchへのご意見、不具合報告、機能要望の送り方をご案内します。" },
  en: { title: "Feedback · NeON Church", description: "How to send feedback, report bugs, or request features for NeON Church." },
});

export default function FeedbackPage() {
  return <FeedbackContent />;
}
