import type { ArticleVisibility } from "./types";
import type { Translations } from "./i18n";

export function visibilityLabel(visibility: ArticleVisibility, t: Translations): string {
  if (visibility === "public") return t.visibilityPublic;
  return t.visibilityPrivate;
}

export function visibilityOptions(t: Translations): { value: ArticleVisibility; label: string; help: string }[] {
  return [
    { value: "private", label: t.visibilityPrivate, help: t.visibilityPrivateHelp },
    { value: "public", label: t.visibilityPublic, help: t.visibilityPublicHelp },
  ];
}

export function articleTagLabel(slug: string, fallback: string, t: Translations): string {
  return t.articleTagNames[slug] ?? fallback;
}
