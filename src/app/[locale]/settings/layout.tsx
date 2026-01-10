import { type Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SettingsShell } from "./_components/settings-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const localeToOgLocale: Record<string, string> = {
  en: "en_US",
  ko: "ko_KR",
  ja: "ja_JP",
  "zh-CN": "zh_CN",
  "zh-TW": "zh_TW",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "settings" });

  const baseUrl = "https://open.tamago.chat";
  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${baseUrl}${localePath}/settings`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("pageTitle");
  const description = t("pageDescription");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
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
