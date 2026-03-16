import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConnectPageClient } from "./_components/connect-page-client";
import { localeToOgLocale, generateAlternateLanguages, BASE_URL } from "~/lib/seo";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "connect" });

  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${BASE_URL}${localePath}/p2p/connect`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("meta.title");
  const description = t("meta.description");

  return {
    title,
    description,
    keywords: [
      "multi-character chat",
      "AI character chat",
      "P2P chat",
      "WebRTC chat",
      "character roleplay",
      "AI auto-reply",
      "group AI chat",
      "character session",
    ],
    alternates: {
      canonical: canonicalUrl,
      languages: generateAlternateLanguages("/p2p/connect"),
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

export default async function ConnectPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ConnectPageClient />;
}
