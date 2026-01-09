import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MainLayout } from "~/components/layout";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pokebox" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function PokeboxLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MainLayout showFooter={false}>{children}</MainLayout>;
}
