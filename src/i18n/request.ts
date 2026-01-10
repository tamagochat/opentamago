import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import type { Locale } from "./config";

// Import messages statically
import enMessages from "./messages/en.json";
import koMessages from "./messages/ko.json";
import jaMessages from "./messages/ja.json";
import zhCNMessages from "./messages/zh-CN.json";
import zhTWMessages from "./messages/zh-TW.json";
import idMessages from "./messages/id.json";
import viMessages from "./messages/vi.json";
import esMessages from "./messages/es.json";
import ptMessages from "./messages/pt.json";
import deMessages from "./messages/de.json";
import frMessages from "./messages/fr.json";
import trMessages from "./messages/tr.json";
import ruMessages from "./messages/ru.json";
import nlMessages from "./messages/nl.json";
import plMessages from "./messages/pl.json";
import thMessages from "./messages/th.json";
import hiMessages from "./messages/hi.json";

const messages: Record<Locale, typeof enMessages> = {
  en: enMessages,
  ko: koMessages,
  ja: jaMessages,
  "zh-CN": zhCNMessages,
  "zh-TW": zhTWMessages,
  id: idMessages,
  vi: viMessages,
  es: esMessages,
  pt: ptMessages,
  de: deMessages,
  fr: frMessages,
  tr: trMessages,
  ru: ruMessages,
  nl: nlMessages,
  pl: plMessages,
  th: thMessages,
  hi: hiMessages,
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: messages[locale as Locale],
  };
});
