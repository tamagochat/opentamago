import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WebRTCProvider } from "~/app/_components/p2p/webrtc-provider";
import { ConnectManagerProvider } from "~/app/_components/p2p/connect-manager-provider";
import { localeToOgLocale, generateAlternateLanguages, BASE_URL } from "~/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "p2p" });

  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${BASE_URL}${localePath}/p2p`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("title");
  const description = t("subtitle");

  return {
    title,
    description,
    keywords: [
      "P2P file sharing",
      "CharX sharing",
      "WebRTC file transfer",
      "peer-to-peer",
      "character file sharing",
      "multi-character chat",
      "AI character chat",
      "QR code sharing",
      "password-protected sharing",
      "browser-to-browser transfer",
      "no server upload",
    ],
    alternates: {
      canonical: canonicalUrl,
      languages: generateAlternateLanguages("/p2p"),
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

export default function P2PLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WebRTCProvider>
      <ConnectManagerProvider>
        {children}
      </ConnectManagerProvider>
    </WebRTCProvider>
  );
}
