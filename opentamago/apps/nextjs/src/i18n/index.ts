export { locales, defaultLocale, localeNames } from "./config";
export type { Locale } from "./config";
export { routing, Link, redirect, usePathname, useRouter } from "./routing";

// Re-export messages for client-side usage
import enMessages from "./messages/en.json";
import koMessages from "./messages/ko.json";
import jaMessages from "./messages/ja.json";

export const messages = {
  en: enMessages,
  ko: koMessages,
  ja: jaMessages,
} as const;
