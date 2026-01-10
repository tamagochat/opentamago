import {
  FileArchive,
  FolderHeart,
  Pencil,
  Share2,
  Users,
  Lock,
  Wifi,
  QrCode,
  Download,
  Upload,
  Eye,
  Book,
  Image,
  MessageSquare,
  Bot,
  ArrowRight,
  Save,
  Search,
  Sparkles,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "~/i18n/routing";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { MainLayout } from "~/components/layout";

type Props = {
  params: Promise<{ locale: string }>;
};

const localeToOgLocale: Record<string, string> = {
  en: "en_US",
  ko: "ko_KR",
  ja: "ja_JP",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "howItWorks" });

  const baseUrl = "https://open.tamago.chat";
  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${baseUrl}${localePath}/how-it-works`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = t("meta.title");
  const description = t("meta.description");

  return {
    title,
    description,
    keywords: [
      "CharX tutorial",
      "P2P sharing guide",
      "multi-character chat guide",
      "AI character tutorial",
      "WebRTC tutorial",
      "how to use CharX",
      "OpenTamago guide",
    ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${baseUrl}/how-it-works`,
        ko: `${baseUrl}/ko/how-it-works`,
        ja: `${baseUrl}/ja/how-it-works`,
        "x-default": `${baseUrl}/how-it-works`,
      },
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

export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("howItWorks");

  const features = [
    {
      id: "charx",
      icon: FileArchive,
      title: t("charx.title"),
      description: t("charx.description"),
      href: "/charx" as const,
      steps: [
        {
          icon: Upload,
          title: t("charx.steps.upload.title"),
          description: t("charx.steps.upload.description"),
        },
        {
          icon: Eye,
          title: t("charx.steps.view.title"),
          description: t("charx.steps.view.description"),
        },
        {
          icon: Book,
          title: t("charx.steps.lorebook.title"),
          description: t("charx.steps.lorebook.description"),
        },
        {
          icon: Image,
          title: t("charx.steps.assets.title"),
          description: t("charx.steps.assets.description"),
        },
      ],
      highlights: [
        t("charx.highlights.privacy"),
        t("charx.highlights.formats"),
        t("charx.highlights.export"),
      ],
    },
    {
      id: "charx-editor",
      icon: Pencil,
      title: t("charxEditor.title"),
      description: t("charxEditor.description"),
      href: "/charx/editor" as const,
      steps: [
        {
          icon: Sparkles,
          title: t("charxEditor.steps.create.title"),
          description: t("charxEditor.steps.create.description"),
        },
        {
          icon: Pencil,
          title: t("charxEditor.steps.edit.title"),
          description: t("charxEditor.steps.edit.description"),
        },
        {
          icon: Book,
          title: t("charxEditor.steps.lorebook.title"),
          description: t("charxEditor.steps.lorebook.description"),
        },
        {
          icon: Save,
          title: t("charxEditor.steps.export.title"),
          description: t("charxEditor.steps.export.description"),
        },
      ],
      highlights: [
        t("charxEditor.highlights.aiAssistant"),
        t("charxEditor.highlights.templates"),
        t("charxEditor.highlights.localSave"),
      ],
    },
    {
      id: "charx-pokebox",
      icon: FolderHeart,
      title: t("charxPokebox.title"),
      description: t("charxPokebox.description"),
      href: "/pokebox" as const,
      steps: [
        {
          icon: Upload,
          title: t("charxPokebox.steps.import.title"),
          description: t("charxPokebox.steps.import.description"),
        },
        {
          icon: Search,
          title: t("charxPokebox.steps.organize.title"),
          description: t("charxPokebox.steps.organize.description"),
        },
        {
          icon: Eye,
          title: t("charxPokebox.steps.preview.title"),
          description: t("charxPokebox.steps.preview.description"),
        },
        {
          icon: MessageSquare,
          title: t("charxPokebox.steps.use.title"),
          description: t("charxPokebox.steps.use.description"),
        },
      ],
      highlights: [
        t("charxPokebox.highlights.localStorage"),
        t("charxPokebox.highlights.unlimited"),
        t("charxPokebox.highlights.quickAccess"),
      ],
    },
    {
      id: "p2p-share",
      icon: Share2,
      title: t("p2pShare.title"),
      description: t("p2pShare.description"),
      href: "/p2p/share" as const,
      steps: [
        {
          icon: Upload,
          title: t("p2pShare.steps.select.title"),
          description: t("p2pShare.steps.select.description"),
        },
        {
          icon: QrCode,
          title: t("p2pShare.steps.generate.title"),
          description: t("p2pShare.steps.generate.description"),
        },
        {
          icon: Wifi,
          title: t("p2pShare.steps.transfer.title"),
          description: t("p2pShare.steps.transfer.description"),
        },
        {
          icon: Download,
          title: t("p2pShare.steps.receive.title"),
          description: t("p2pShare.steps.receive.description"),
        },
      ],
      highlights: [
        t("p2pShare.highlights.noServer"),
        t("p2pShare.highlights.password"),
        t("p2pShare.highlights.qrCode"),
      ],
    },
    {
      id: "p2p-connect",
      icon: Users,
      title: t("p2pConnect.title"),
      description: t("p2pConnect.description"),
      href: "/p2p/connect" as const,
      steps: [
        {
          icon: Users,
          title: t("p2pConnect.steps.select.title"),
          description: t("p2pConnect.steps.select.description"),
        },
        {
          icon: QrCode,
          title: t("p2pConnect.steps.invite.title"),
          description: t("p2pConnect.steps.invite.description"),
        },
        {
          icon: MessageSquare,
          title: t("p2pConnect.steps.chat.title"),
          description: t("p2pConnect.steps.chat.description"),
        },
        {
          icon: Bot,
          title: t("p2pConnect.steps.ai.title"),
          description: t("p2pConnect.steps.ai.description"),
        },
      ],
      highlights: [
        t("p2pConnect.highlights.realtime"),
        t("p2pConnect.highlights.multiParty"),
        t("p2pConnect.highlights.autoReply"),
      ],
    },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              {t("hero.title")}
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Features Detail Sections */}
      {features.map((feature, index) => {
        const Icon = feature.icon;
        const isEven = index % 2 === 0;

        return (
          <section
            key={feature.id}
            className={`py-16 sm:py-24 ${isEven ? "" : "bg-muted/30"}`}
          >
            <div className="container">
              <div className="max-w-5xl mx-auto">
                {/* Feature Header */}
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                    <Icon className="h-4 w-4" />
                    {feature.title}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl mb-4">
                    {feature.title}
                  </h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    {feature.description}
                  </p>
                </div>

                {/* Steps */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
                  {feature.steps.map((step, stepIndex) => {
                    const StepIcon = step.icon;
                    return (
                      <Card key={stepIndex} className="relative">
                        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {stepIndex + 1}
                        </div>
                        <CardHeader className="pb-2 pt-6">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                            <StepIcon className="h-5 w-5 text-primary" />
                          </div>
                          <CardTitle className="text-base">{step.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {step.description}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Highlights */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  {feature.highlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-sm"
                    >
                      <Lock className="h-4 w-4 text-primary" />
                      {highlight}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="text-center">
                  <Button asChild size="lg" className="gap-2">
                    <Link href={feature.href}>
                      {t("tryNow")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Privacy Section */}
      <section className="py-16 sm:py-24 bg-primary/5">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl mb-4">
              {t("privacy.title")}
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              {t("privacy.description")}
            </p>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="p-6 rounded-lg bg-background border">
                <h3 className="font-semibold mb-2">{t("privacy.noServer.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("privacy.noServer.description")}
                </p>
              </div>
              <div className="p-6 rounded-lg bg-background border">
                <h3 className="font-semibold mb-2">{t("privacy.encrypted.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("privacy.encrypted.description")}
                </p>
              </div>
              <div className="p-6 rounded-lg bg-background border">
                <h3 className="font-semibold mb-2">{t("privacy.openSource.title")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("privacy.openSource.description")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
