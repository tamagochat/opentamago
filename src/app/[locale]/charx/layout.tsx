import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

const localeToOgLocale: Record<string, string> = {
  en: "en_US",
  ko: "ko_KR",
  ja: "ja_JP",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "charx" });

  const baseUrl = "https://opentamago.vercel.app";
  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${baseUrl}${localePath}/charx`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    keywords: [
      "CharX viewer",
      "CharX file",
      "character card viewer",
      "lorebook viewer",
      "RisuAI",
      "AI character",
      "character assets",
      "browser-based",
      "privacy-first",
      "offline viewer",
      "local processing",
    ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/charx`,
        ko: `${baseUrl}/ko/charx`,
        ja: `${baseUrl}/ja/charx`,
        "x-default": `${baseUrl}/charx`,
      },
    },
    openGraph: {
      title: `${title} | OpenTamago`,
      description,
      locale: ogLocale,
    },
    twitter: {
      title: `${title} | OpenTamago`,
      description,
    },
  };
}

export default function CharXLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
