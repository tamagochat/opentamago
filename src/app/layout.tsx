import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";

import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "~/components/theme-provider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: {
    default: "OpenTamago - AI Character Chat Platform",
    template: "%s | OpenTamago",
  },
  description:
    "Open-source platform for AI character creation, viewing, and chat. View CharX files, create custom characters, and have conversations with AI.",
  keywords: [
    "AI character",
    "CharX",
    "character chat",
    "AI roleplay",
    "character creator",
    "open source",
    "RisuAI",
  ],
  authors: [{ name: "OpenTamago" }],
  creator: "OpenTamago",
  metadataBase: new URL("https://opentamago.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "OpenTamago",
    title: "OpenTamago - AI Character Chat Platform",
    description:
      "Open-source platform for AI character creation, viewing, and chat. View CharX files, create custom characters, and have conversations with AI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenTamago - AI Character Chat Platform",
    description:
      "Open-source platform for AI character creation, viewing, and chat.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
