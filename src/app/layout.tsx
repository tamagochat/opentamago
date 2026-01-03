import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "~/components/theme-provider";
import { TRPCReactProvider } from "~/trpc/react";
import {
  WebApplicationJsonLd,
  OrganizationJsonLd,
  WebsiteJsonLd,
} from "~/components/seo/json-ld";

export const metadata: Metadata = {
  title: {
    default: "OpenTamago - AI Character Chat Platform",
    template: "%s | OpenTamago",
  },
  description:
    "Open-source platform for AI character viewing and sharing. View CharX files, share characters via P2P, and chat with AI characters.",
  keywords: [
    "AI character",
    "CharX",
    "character chat",
    "AI roleplay",
    "character viewer",
    "open source",
    "RisuAI",
    "P2P sharing",
  ],
  authors: [{ name: "OpenTamago" }],
  creator: "OpenTamago",
  metadataBase: new URL("https://opentamago.com"),
  alternates: {
    canonical: "https://opentamago.com",
    languages: {
      en: "https://opentamago.com",
      ko: "https://opentamago.com/ko",
      ja: "https://opentamago.com/ja",
      "x-default": "https://opentamago.com",
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "OpenTamago",
    title: "OpenTamago - AI Character Chat Platform",
    description:
      "Open-source platform for AI character viewing and sharing. View CharX files, share characters via P2P, and chat with AI.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OpenTamago - AI Character Viewer & Sharing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenTamago - AI Character Chat Platform",
    description:
      "Open-source platform for AI character viewing and sharing.",
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
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster richColors />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
