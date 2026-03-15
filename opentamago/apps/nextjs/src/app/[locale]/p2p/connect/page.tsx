import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConnectPageClient } from "./_components/connect-page-client";

type PageProps = {
  params: Promise<{ locale: string }>;
};

const localeToOgLocale: Record<string, string> = {
  en: "en_US",
  ko: "ko_KR",
  ja: "ja_JP",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "connect" });

  const baseUrl = "https://open.tamago.chat";
  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${baseUrl}${localePath}/p2p/connect`;
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
      languages: {
        en: `${baseUrl}/p2p/connect`,
        ko: `${baseUrl}/ko/p2p/connect`,
        ja: `${baseUrl}/ja/p2p/connect`,
        "x-default": `${baseUrl}/p2p/connect`,
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

export default async function ConnectPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ConnectPageClient />;
}
