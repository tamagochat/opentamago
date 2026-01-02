import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { JoinPageClient } from "./join-page-client";

type PageProps = {
  params: Promise<{ locale: string; slug: string[] }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "connect" });

  return {
    title: t("join.meta.title"),
    description: t("join.meta.description"),
    openGraph: {
      title: t("join.meta.title"),
      description: t("join.meta.description"),
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
    />
  );
}
