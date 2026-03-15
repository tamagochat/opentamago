import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { JoinPageClient } from "./join-page-client";

type PageProps = {
  params: Promise<{ locale: string; slug: string[] }>;
};

const localeToOgLocale: Record<string, string> = {
  en: "en_US",
  ko: "ko_KR",
  ja: "ja_JP",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "connect" });
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("join.meta.title");
  const description = t("join.meta.description");

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
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

export default async function JoinPage({ params }: PageProps) {
  const { locale, slug: slugParts } = await params;
  setRequestLocale(locale);

  // Join slug parts (handles both short and long slugs)
  const slug = slugParts.join("-");

  // Verify session exists
  const session = await api.connect.getSession({ slug });

  if (!session) {
    notFound();
  }

  return (
    <JoinPageClient
      slug={slug}
      hostPeerId={session.hostPeerId}
      initialParticipants={session.participants}
      isFull={session.isFull}
      hasPassword={session.hasPassword}
    />
  );
}
