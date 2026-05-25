import type { Metadata } from "next";
import { LicensesContent } from "./LicensesContent";

export const metadata: Metadata = {
  title: "Licenses · NeON Church",
  description:
    "Licensing information for scripture texts, user-submitted translations, source code, and assets used by NeON Church.",
};

export default function LicensesPage() {
  return <LicensesContent />;
}
