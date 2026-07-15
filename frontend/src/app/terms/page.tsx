import type { Metadata } from "next";
import { TermsContent } from "./TermsContent";

export const metadata: Metadata = {
  title: "Terms of Service · NeON Church",
  description:
    "Terms of service for NeON Church — a collaborative reader for the ancient texts, every one of them.",
};

export default function TermsPage() {
  return <TermsContent />;
}
