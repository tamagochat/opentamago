import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MainLayout } from "~/components/layout";
import { locales } from "~/i18n/config";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const localeToOgLocale: Record<string, string> = {
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
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pokebox" });

  const baseUrl = "https://open.tamago.chat";
  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${baseUrl}${localePath}/pokebox`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("meta.title");
  const description = t("meta.description");

  // Generate alternate language links for all supported locales
  const languages: Record<string, string> = {};
  for (const loc of locales) {
    const path = loc === "en" ? "" : `/${loc}`;
    languages[loc] = `${baseUrl}${path}/pokebox`;
  }
  languages["x-default"] = `${baseUrl}/pokebox`;

  return {
    title,
    description,
    keywords: [
      "CharX PokeBox",
      "AI character library",
      "character card manager",
      "lorebook manager",
      "character assets",
      "RisuAI characters",
      "SillyTavern characters",
      "local character storage",
      "offline character viewer",
      "AI roleplay characters",
      "character card collection",
      "privacy-first",
    ],
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    openGraph: {
      title,
      description,
      locale: ogLocale,
      type: "website",
      siteName: "OpenTamago",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PokeboxLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MainLayout showFooter={false}>{children}</MainLayout>;
}
