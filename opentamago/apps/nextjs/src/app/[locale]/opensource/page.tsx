import { ExternalLink, GitFork, Star } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { MainLayout } from "~/components/layout";
import { localeToOgLocale, generateAlternateLanguages, BASE_URL } from "~/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

const projects = [
  {
    name: "opentamago",
    repo: "https://github.com/tamagochat/opentamago",
    descKey: "opentamagoDesc" as const,
  },
  {
    name: "SillyTavern-vault",
    repo: "https://github.com/tamagochat/SillyTavern-vault",
    descKey: "vaultDesc" as const,
  },
  {
    name: "SillyTavern-hetzner",
    repo: "https://github.com/tamagochat/SillyTavern-hetzner",
    descKey: "hetznerDesc" as const,
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "opensource" });

  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${BASE_URL}${localePath}/opensource`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("meta.title");
  const description = t("meta.description");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: generateAlternateLanguages("/opensource"),
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

export default async function OpenSourcePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "opensource" });

  return (
    <MainLayout>
      <div className="container max-w-4xl py-12 md:py-16">
        <div className="space-y-2 text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-6">
          {projects.map((project) => (
            <a
              key={project.name}
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <Card className="transition-colors hover:border-primary/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    <GitFork className="h-5 w-5 text-muted-foreground" />
                    {project.name}
                  </CardTitle>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t(project.descKey)}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5" />
                    <span className="group-hover:text-primary transition-colors">
                      {t("viewOnGithub")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
