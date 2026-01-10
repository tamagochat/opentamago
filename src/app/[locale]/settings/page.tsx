import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Redirect to default tab (personas)
  const localePath = locale === "en" ? "" : `/${locale}`;
  redirect(`${localePath}/settings/personas`);
}
