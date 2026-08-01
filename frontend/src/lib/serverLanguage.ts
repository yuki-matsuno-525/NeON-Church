import "server-only";

import { cookies } from "next/headers";
import type { Metadata } from "next";
import type { SiteLang } from "./siteCopy";

export async function getRequestLanguage(): Promise<SiteLang> {
  return (await cookies()).get("neon_lang")?.value === "en" ? "en" : "ja";
}

export async function localizedPageMetadata(copy: Record<SiteLang, { title: string; description: string }>): Promise<Metadata> {
  const selected = copy[await getRequestLanguage()];
  return {
    title: selected.title,
    description: selected.description,
    openGraph: { title: selected.title, description: selected.description },
    twitter: { title: selected.title, description: selected.description },
  };
}
