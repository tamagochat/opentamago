import { locales } from "~/i18n/config";

export const BASE_URL = "https://open.tamago.chat";

export const localeToOgLocale: Record<string, string> = {
  en: "en_US",
  ko: "ko_KR",
  ja: "ja_JP",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
  id: "id_ID",
  vi: "vi_VN",
  es: "es_ES",
  pt: "pt_BR",
  de: "de_DE",
  fr: "fr_FR",
  tr: "tr_TR",
  ru: "ru_RU",
  nl: "nl_NL",
  pl: "pl_PL",
  th: "th_TH",
  hi: "hi_IN",
};

export function generateAlternateLanguages(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const prefix = locale === "en" ? "" : `/${locale}`;
    languages[locale] = `${BASE_URL}${prefix}${path}`;
  }
  languages["x-default"] = `${BASE_URL}${path}`;
  return languages;
}
