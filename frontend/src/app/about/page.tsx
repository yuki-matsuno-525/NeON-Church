import type { Metadata } from "next";
import { AboutContent } from "./AboutContent";

export const metadata: Metadata = {
  title: "About NeON Church",
  description:
    "NeON Church is a platform for reading and discussing the Bible, Apocrypha, and Pseudepigrapha. Comment on verses and chapters, ask questions, and join collaborative translation projects.",
};

export default function AboutPage() {
  return <AboutContent />;
}
