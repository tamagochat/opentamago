import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ConnectPageClient } from "./_components/connect-page-client";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "connect" });

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    openGraph: {
      title: t("meta.title"),
      description: t("meta.description"),
    },
  };
}

export default async function ConnectPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ConnectPageClient />;
}
