// ReactScan must be imported first for debugging
import { ReactScan } from "~/components/react-scan";

import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "~/components/theme-provider";
import { TRPCReactProvider } from "~/trpc/react";
import {
  WebApplicationJsonLd,
  OrganizationJsonLd,
  WebsiteJsonLd,
} from "~/components/seo/json-ld";
import { DatabaseProvider } from "~/lib/db";

export const metadata: Metadata = {
  title: {
    default: "OpenTamago - AI Character Chat Platform",
    template: "%s | OpenTamago",
  },
  description:
    "Privacy-first open-source platform for AI character viewing, P2P sharing, and multi-character chat. View CharX files locally, share via WebRTC, and chat with multiple AI characters.",
  keywords: [
    "AI character",
    "CharX viewer",
    "CharX file",
    "character card viewer",
    "AI roleplay",
    "P2P file sharing",
    "WebRTC",
    "multi-character chat",
    "AI chat",
    "RisuAI",
    "open source",
    "privacy-first",
    "browser-based",
    "lorebook viewer",
  ],
  authors: [{ name: "OpenTamago" }],
  creator: "OpenTamago",
  metadataBase: new URL("https://open.tamago.chat"),
  alternates: {
    canonical: "https://open.tamago.chat",
    languages: {
      en: "https://open.tamago.chat",
      ko: "https://open.tamago.chat/ko",
      ja: "https://open.tamago.chat/ja",
      "x-default": "https://open.tamago.chat",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "OpenTamago",
    title: "OpenTamago - Privacy-First AI Character Platform",
    description:
      "View CharX files locally, share via P2P, and chat with multiple AI characters. 100% browser-based, open source, privacy-first.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenTamago - AI Character Viewer, P2P Sharing & Multi-Character Chat",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenTamago - Privacy-First AI Character Platform",
    description:
      "View CharX files locally, share via P2P, and chat with multiple AI characters. Open source & privacy-first.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      {process.env.NODE_ENV === "development" && <ReactScan />}
      <head>
        <WebApplicationJsonLd />
        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <DatabaseProvider>
              {children}
            </DatabaseProvider>
          </TRPCReactProvider>
          <Toaster richColors />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
