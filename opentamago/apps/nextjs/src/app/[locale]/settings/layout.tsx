import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsShell } from "./_components/settings-shell";
import { localeToOgLocale, generateAlternateLanguages, BASE_URL } from "~/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });

  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${BASE_URL}${localePath}/settings`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("pageTitle");
  const description = t("pageDescription");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: generateAlternateLanguages("/settings"),
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

export default async function SettingsLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SettingsShell>{children}</SettingsShell>;
}
