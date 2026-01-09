export const locales = ["en", "ko", "ja", "zh-CN", "zh-TW", "id", "vi", "es", "pt", "de", "fr", "tr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  es: "Español",
  pt: "Português",
  de: "Deutsch",
  fr: "Français",
  tr: "Türkçe",
};
