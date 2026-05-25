import type { Metadata } from "next";
import { PrivacyContent } from "./PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy · NeON Church",
  description:
    "Privacy policy for NeON Church — what data we collect, how we use it, and your rights.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
