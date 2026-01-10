import { type Metadata } from "next";
import {
  Egg,
  FileArchive,
  Share2,
  Shield,
  Zap,
  ArrowRight,
  Upload,
  Eye,
  Lock,
  QrCode,
  Wifi,
  Users,
  MessageSquare,
  Bot,
} from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "~/i18n/routing";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { MainLayout } from "~/components/layout";
import { CharxViewerDemo } from "./_components/charx-viewer-demo";
import { P2pSharingDemo } from "./_components/p2p-sharing-demo";
import { ConnectDemo } from "./_components/connect-demo";
import { HeroCarousel } from "./_components/hero-carousel";

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
  const t = await getTranslations({ locale, namespace: "home" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const baseUrl = "https://open.tamago.chat";
  const localePath = locale === "en" ? "" : `/${locale}`;
  const canonicalUrl = `${baseUrl}${localePath}`;
  const ogLocale = localeToOgLocale[locale] ?? "en_US";

  const title = tCommon("appName");
  const description = t("hero.description");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: baseUrl,
        ko: `${baseUrl}/ko`,
        ja: `${baseUrl}/ja`,
        "x-default": baseUrl,
      },
    },
    openGraph: {
      title: `${title} - ${tCommon("tagline")}`,
      description,
      locale: ogLocale,
      alternateLocale: ["en_US", "ko_KR", "ja_JP"].filter((l) => l !== ogLocale),
    },
    twitter: {
      title: `${title} - ${tCommon("tagline")}`,
      description,
    },
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");

  const features = [
    {
      icon: FileArchive,
      title: t("features.charxViewer.title"),
      description: t("features.charxViewer.description"),
      href: "/charx" as const,
      available: true,
    },
    {
      icon: Share2,
      title: t("features.p2pSharing.title"),
      description: t("features.p2pSharing.description"),
      href: "/p2p/share" as const,
      available: true,
    },
    {
      icon: Users,
      title: t("features.connect.title"),
      description: t("features.connect.description"),
      href: "/p2p/connect" as const,
      available: true,
    },
  ];

  const highlights = [
    {
      icon: Lock,
      title: t("highlights.privacy.title"),
      description: t("highlights.privacy.description"),
    },
    {
      icon: Zap,
      title: t("highlights.fast.title"),
      description: t("highlights.fast.description"),
    },
    {
      icon: Shield,
      title: t("highlights.openSource.title"),
      description: t("highlights.openSource.description"),
    },
  ];
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative py-16 sm:py-24 md:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-primary/10 border border-primary/20">
                <Egg className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <span className="text-xs sm:text-sm font-medium">{tCommon("tagline")}</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              {t("hero.title")}
              <span className="text-primary"> {t("hero.titleHighlight")}</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col gap-4 sm:gap-6 items-center">
              <Button size="lg" asChild className="gap-2">
                <Link href="/charx">
                  <FileArchive className="h-5 w-5" />
                  {t("cta.openViewer")}
                </Link>
              </Button>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("cta.p2pLabel")}</span>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button size="lg" variant="outline" asChild className="gap-2">
                    <Link href="/p2p/share">
                      <Share2 className="h-5 w-5" />
                      {t("cta.startSharing")}
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="gap-2">
                    <Link href="/p2p/connect">
                      <Users className="h-5 w-5" />
                      {t("cta.startConnect")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Carousel */}
          <div className="mt-12 sm:mt-16">
            <HeroCarousel />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-muted/30">
        <div className="container">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              {t("features.title")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("features.description")}
            </p>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              const cardContent = (
                <>
                  <CardHeader className="pb-2 sm:pb-4">
                    <div className="mb-2 w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      {feature.title}
                      {feature.available ? (
                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      ) : (
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {tCommon("comingSoon")}
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </>
              );

              return (
                <Card
                  key={feature.title}
                  className={`group relative overflow-hidden transition-all ${
                    feature.available
                      ? "hover:shadow-lg hover:border-primary/50 cursor-pointer"
                      : "opacity-60"
                  }`}
                >
                  {feature.available ? (
                    <Link href={feature.href}>{cardContent}</Link>
                  ) : (
                    <div>{cardContent}</div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CharX Showcase Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28">
        <div className="container">
          <div className="grid gap-8 sm:gap-12 lg:grid-cols-2 items-center">
            <div className="order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                {t("showcase.badge")}
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl mb-4 sm:mb-6">
                {t("showcase.title")}
              </h2>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("showcase.dragDrop.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("showcase.dragDrop.description")}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileArchive className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("showcase.cardInfo.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("showcase.cardInfo.description")}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("showcase.clientSide.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("showcase.clientSide.description")}
                    </p>
                  </div>
                </li>
              </ul>
              <div className="mt-6 sm:mt-8">
                <Button asChild className="gap-2">
                  <Link href="/charx">
                    {t("cta.tryViewer")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative order-2">
              <CharxViewerDemo />
            </div>
          </div>
        </div>
      </section>

      {/* P2P Showcase Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-muted/30">
        <div className="container">
          <div className="grid gap-8 sm:gap-12 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              <P2pSharingDemo />
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                {t("p2pShowcase.badge")}
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl mb-4 sm:mb-6">
                {t("p2pShowcase.title")}
              </h2>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <QrCode className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("p2pShowcase.qrCode.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("p2pShowcase.qrCode.description")}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Wifi className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("p2pShowcase.webrtc.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("p2pShowcase.webrtc.description")}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("p2pShowcase.password.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("p2pShowcase.password.description")}
                    </p>
                  </div>
                </li>
              </ul>
              <div className="mt-6 sm:mt-8">
                <Button asChild className="gap-2">
                  <Link href="/p2p/share">
                    {t("cta.startSharing")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connect Showcase Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28">
        <div className="container">
          <div className="grid gap-8 sm:gap-12 lg:grid-cols-2 items-center">
            <div className="order-1">
              <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  {t("connectShowcase.badge")}
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("connectShowcase.poweredBy")}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl mb-4 sm:mb-6">
                {t("connectShowcase.title")}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                {t("connectShowcase.description")}
              </p>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("connectShowcase.realtime.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("connectShowcase.realtime.description")}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("connectShowcase.aiPowered.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("connectShowcase.aiPowered.description")}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">{t("connectShowcase.multiParty.title")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t("connectShowcase.multiParty.description")}
                    </p>
                  </div>
                </li>
              </ul>
              <div className="mt-6 sm:mt-8">
                <Button asChild className="gap-2">
                  <Link href="/p2p/connect">
                    {t("cta.startConnect")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative order-2">
              <ConnectDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-muted/30">
        <div className="container">
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center">
                  <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">{item.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              {t("ready.title")}
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
              {t("ready.description")}
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col gap-4 sm:gap-6 items-center">
              <Button size="lg" asChild className="gap-2">
                <Link href="/charx">
                  <FileArchive className="h-5 w-5" />
                  {t("cta.openViewer")}
                </Link>
              </Button>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("cta.p2pLabel")}</span>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button size="lg" variant="outline" asChild className="gap-2">
                    <Link href="/p2p/share">
                      <Share2 className="h-5 w-5" />
                      {t("cta.startSharing")}
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="gap-2">
                    <Link href="/p2p/connect">
                      <Users className="h-5 w-5" />
                      {t("cta.startConnect")}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
