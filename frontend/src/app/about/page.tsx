import type { Metadata } from "next";
import { AboutContent } from "./AboutContent";

export const metadata: Metadata = {
  title: "About NeON Church",
  description:
    "NeON Church is a new Christian platform where texts and interpretations intersect — bridging Non-Church Christianity, postmodern thought, and texts placed outside the canon.",
  openGraph: {
    title: "About NeON Church",
    description:
      "NeON Church is a new Christian platform where texts and interpretations intersect — bridging Non-Church Christianity, postmodern thought, and texts placed outside the canon.",
    images: [{ url: "/img/logo-og.png", width: 512, height: 512, alt: "NeON Church" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About NeON Church",
    description:
      "NeON Church is a new Christian platform where texts and interpretations intersect — bridging Non-Church Christianity, postmodern thought, and texts placed outside the canon.",
    images: ["/img/logo-og.png"],
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
