import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MainLayout } from "~/components/layout";
import { localeToOgLocale, generateAlternateLanguages, BASE_URL } from "~/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "charxEditor" });

  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${BASE_URL}${localePath}/charx/editor`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("meta.title");
  const description = t("meta.description");

  return {
    title,
    description,
    keywords: [
      "AI character creator",
      "character card editor",
      "CharX editor",
      "AI assistant",
      "character generator",
      "lorebook editor",
      "character assets",
      "roleplay characters",
      "AI chat characters",
      "character card maker",
    ],
    alternates: {
      canonical: canonicalUrl,
      languages: generateAlternateLanguages("/charx/editor"),
    },
    openGraph: {
      title,
      description,
      locale: ogLocale,
      type: "website",
      siteName: "OpenTamago",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function CharxEditorLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MainLayout showFooter={false}>{children}</MainLayout>;
}
