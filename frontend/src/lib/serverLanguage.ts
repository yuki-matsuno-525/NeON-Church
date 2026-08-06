import "server-only";

import { cookies } from "next/headers";
import type { Metadata } from "next";
import type { SiteLang } from "./siteCopy";
import { DEFAULT_TRANSLATION } from "./translations";
import { TRANSLATION_COOKIE } from "./translationPreference";

export async function getRequestLanguage(): Promise<SiteLang> {
  return (await cookies()).get("neon_lang")?.value === "en" ? "en" : "ja";
}

/**
 * このブラウザがどの訳で読みたがっているか。
 * まだ選んだことが無ければ既定の訳（口語訳）。
 */
export async function getRequestTranslation(): Promise<string> {
  return (await cookies()).get(TRANSLATION_COOKIE)?.value || DEFAULT_TRANSLATION;
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
