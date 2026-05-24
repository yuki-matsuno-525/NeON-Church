import type { Metadata } from "next";
import { AboutContent } from "./AboutContent";

export const metadata: Metadata = {
  title: "NeON Church について",
  description: "NeON Church は聖書を読み、語り合うためのプラットフォームです。節・章へのコメント、Q&A、共同翻訳プロジェクトに参加できます。",
};

export default function AboutPage() {
  return <AboutContent />;
}
