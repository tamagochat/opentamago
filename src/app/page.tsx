import Link from "next/link";
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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { MainLayout } from "~/components/layout";

const features = [
  {
    icon: FileArchive,
    title: "CharX Viewer",
    description:
      "View and inspect character cards, lorebooks, and assets from CharX files. Everything runs locally in your browser.",
    href: "/charx",
    available: true,
  },
  {
    icon: Share2,
    title: "P2P CharX Sharing",
    description:
      "Share character files directly with others using peer-to-peer technology. No server uploads, instant transfers.",
    href: "/share",
    available: false,
  },
];

const highlights = [
  {
    icon: Lock,
    title: "Privacy First",
    description: "Your data stays on your device. CharX files are processed entirely in your browser.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built with modern web technologies for instant loading and smooth interactions.",
  },
  {
    icon: Shield,
    title: "Open Source",
    description: "Fully transparent codebase. Audit, contribute, and customize to your needs.",
  },
];

export default function Home() {
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
                <span className="text-xs sm:text-sm font-medium">Open Source AI Characters</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
              Your AI Character
              <span className="text-primary"> Companion</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              Create, view, and chat with AI characters. An open-source platform for character card management and AI conversations.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" asChild className="gap-2 w-full sm:w-auto">
                <Link href="/charx">
                  <FileArchive className="h-5 w-5" />
                  Open CharX Viewer
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2 w-full sm:w-auto">
                <a
                  href="https://github.com/tamagochat/opentamago"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-28 bg-muted/30">
        <div className="container">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete toolkit for AI character enthusiasts
            </p>
          </div>
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 max-w-3xl mx-auto">
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
                          Coming Soon
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
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                CharX Viewer
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl mb-4 sm:mb-6">
                Inspect Character Files with Ease
              </h2>
              <ul className="space-y-3 sm:space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Drag & Drop Upload</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Simply drop your .charx files to instantly view their contents
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileArchive className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">Complete Card Information</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      View character details, system prompts, greetings, and more
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Lock className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm sm:text-base">100% Client-Side</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Your files never leave your browser - complete privacy guaranteed
                    </p>
                  </div>
                </li>
              </ul>
              <div className="mt-6 sm:mt-8">
                <Button asChild className="gap-2 w-full sm:w-auto">
                  <Link href="/charx">
                    Try CharX Viewer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative order-1 lg:order-2">
              <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-muted to-muted/50 border shadow-xl sm:shadow-2xl overflow-hidden">
                <div className="absolute inset-0 flex flex-col">
                  <div className="h-8 sm:h-10 bg-background/80 border-b flex items-center gap-2 px-3 sm:px-4">
                    <div className="flex gap-1 sm:gap-1.5">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500/80" />
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">CharX Viewer</span>
                  </div>
                  <div className="flex-1 p-4 flex items-center justify-center">
                    <div className="text-center space-y-3 sm:space-y-4">
                      <div className="w-14 h-14 sm:w-20 sm:h-20 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileArchive className="h-7 w-7 sm:h-10 sm:w-10 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm sm:text-base">Drop .charx files here</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          or click to browse
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
              Ready to Get Started?
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
              Jump right in and explore your character files with our privacy-focused viewer.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button size="lg" asChild className="gap-2 w-full sm:w-auto">
                <Link href="/charx">
                  <FileArchive className="h-5 w-5" />
                  Open CharX Viewer
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2 w-full sm:w-auto">
                <a
                  href="https://github.com/tamagochat/opentamago"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
