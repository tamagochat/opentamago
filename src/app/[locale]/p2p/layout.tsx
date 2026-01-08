import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WebRTCProvider } from "~/app/_components/p2p/webrtc-provider";
import { ConnectManagerProvider } from "~/app/_components/p2p/connect-manager-provider";

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
  const t = await getTranslations({ locale, namespace: "p2p" });

  const baseUrl = "https://opentamago.vercel.app";
  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${baseUrl}${localePath}/p2p`;
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
      languages: {
        en: `${baseUrl}/p2p`,
        ko: `${baseUrl}/ko/p2p`,
        ja: `${baseUrl}/ja/p2p`,
        "x-default": `${baseUrl}/p2p`,
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
