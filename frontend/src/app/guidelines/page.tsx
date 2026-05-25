import type { Metadata } from "next";
import { GuidelinesContent } from "./GuidelinesContent";

export const metadata: Metadata = {
  title: "Community Guidelines · NeON Church",
  description:
    "Community guidelines for NeON Church — how we discuss scripture and related ancient texts with respect for differing traditions.",
};

export default function GuidelinesPage() {
  return <GuidelinesContent />;
}
