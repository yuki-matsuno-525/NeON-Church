import type { Metadata } from "next";
import { FeedbackContent } from "./FeedbackContent";

export const metadata: Metadata = {
  title: "Feedback · NeON Church",
  description: "How to send feedback, report bugs, or request features for NeON Church.",
};

export default function FeedbackPage() {
  return <FeedbackContent />;
}
