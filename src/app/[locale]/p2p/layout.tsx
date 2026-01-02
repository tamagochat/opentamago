import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "P2P CharX Sharing",
  description:
    "Share CharX character files directly with others using peer-to-peer technology. No server uploads, instant transfers.",
  keywords: [
    "P2P file sharing",
    "CharX sharing",
    "WebRTC file transfer",
    "peer-to-peer",
    "character file sharing",
  ],
  openGraph: {
    title: "P2P CharX Sharing | OpenTamago",
    description:
      "Share CharX character files directly with others using peer-to-peer technology.",
  },
  twitter: {
    title: "P2P CharX Sharing | OpenTamago",
    description:
      "Share CharX character files directly with others using peer-to-peer technology.",
  },
};

export default function P2PLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
