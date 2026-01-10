import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "~/i18n/routing";
import type { Locale } from "~/i18n/config";
import { LangSetter } from "~/components/lang-setter";
import { LocaleDetectorDialog } from "~/components/locale-detector-dialog";

// Import messages statically
import enMessages from "~/i18n/messages/en.json";
import koMessages from "~/i18n/messages/ko.json";
import jaMessages from "~/i18n/messages/ja.json";
import zhCNMessages from "~/i18n/messages/zh-CN.json";
import zhTWMessages from "~/i18n/messages/zh-TW.json";
import idMessages from "~/i18n/messages/id.json";
import viMessages from "~/i18n/messages/vi.json";
import esMessages from "~/i18n/messages/es.json";
import ptMessages from "~/i18n/messages/pt.json";
import deMessages from "~/i18n/messages/de.json";
import frMessages from "~/i18n/messages/fr.json";
import trMessages from "~/i18n/messages/tr.json";
import ruMessages from "~/i18n/messages/ru.json";
import nlMessages from "~/i18n/messages/nl.json";
import plMessages from "~/i18n/messages/pl.json";
import thMessages from "~/i18n/messages/th.json";
import hiMessages from "~/i18n/messages/hi.json";

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

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  const localeMessages = messages[locale as Locale];

  return (
    <NextIntlClientProvider locale={locale} messages={localeMessages}>
      <LangSetter />
      <LocaleDetectorDialog />
      {children}
    </NextIntlClientProvider>
  );
}
