export const LANGUAGE_OPTIONS: { tag: string; label: string }[] = [
  { tag: "ja", label: "日本語" },
  { tag: "en", label: "English" },
  { tag: "ko", label: "한국어" },
  { tag: "zh-Hans", label: "中文（简体）" },
  { tag: "zh-Hant", label: "中文（繁體）" },
  { tag: "fr", label: "Français" },
  { tag: "de", label: "Deutsch" },
  { tag: "es", label: "Español" },
  { tag: "pt", label: "Português" },
  { tag: "ar", label: "العربية" },
];

export function languageLabel(tag: string): string {
  return LANGUAGE_OPTIONS.find((l) => l.tag === tag)?.label ?? tag;
}
