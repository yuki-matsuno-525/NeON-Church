import "server-only";

import { cookies } from "next/headers";
import type { Metadata } from "next";
import type { SiteLang } from "./siteCopy";
import { defaultTranslationForLang } from "./translations";
import { TRANSLATION_COOKIE } from "./translationPreference";

/**
 * 表示言語。日本語を選んだ人だけ日本語、それ以外（初めて来た人を含む）は英語。
 * メインの読者は海外の人なので、何も選んでいない人には英語の画面を出す。
 */
export async function getRequestLanguage(): Promise<SiteLang> {
  return (await cookies()).get("neon_lang")?.value === "ja" ? "ja" : "en";
}

/**
 * このブラウザがどの訳で読みたがっているか。
 * まだ選んだことが無ければ、表示言語に合った訳（英語なら KJV、日本語なら口語訳）。
 */
export async function getRequestTranslation(): Promise<string> {
  const remembered = (await cookies()).get(TRANSLATION_COOKIE)?.value;
  return remembered || defaultTranslationForLang(await getRequestLanguage());
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
