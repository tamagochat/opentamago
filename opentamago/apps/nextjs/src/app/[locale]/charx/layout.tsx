import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { localeToOgLocale, generateAlternateLanguages, BASE_URL } from "~/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "charx" });

  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${BASE_URL}${localePath}/charx`;
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
      languages: generateAlternateLanguages("/charx"),
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
