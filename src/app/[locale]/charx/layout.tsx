import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "CharX Viewer",
  description:
    "View and explore CharX character files in your browser. Inspect character cards, lorebooks, assets, and modules without uploading to any server.",
  keywords: [
    "CharX viewer",
    "CharX file",
    "character card viewer",
    "lorebook viewer",
    "RisuAI",
    "AI character",
  ],
  openGraph: {
    title: "CharX Viewer | OpenTamago",
    description:
      "View and explore CharX character files in your browser. Inspect character cards, lorebooks, assets, and modules.",
  },
  twitter: {
    title: "CharX Viewer | OpenTamago",
    description:
      "View and explore CharX character files in your browser.",
  },
};

export default function CharXLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
