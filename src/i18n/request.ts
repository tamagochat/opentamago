import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";
import type { Locale } from "./config";

// Import messages statically
import enMessages from "./messages/en.json";
import koMessages from "./messages/ko.json";
import jaMessages from "./messages/ja.json";

const messages: Record<Locale, typeof enMessages> = {
  en: enMessages,
  ko: koMessages,
  ja: jaMessages,
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
