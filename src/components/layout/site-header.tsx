"use client";

import { useState, useEffect } from "react";
import { Egg, FileArchive, FolderHeart, Menu, Share2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "~/i18n/routing";
import { Button } from "~/components/ui/button";
import { ThemeToggle } from "~/components/theme-toggle";
import { LocaleSwitcher } from "~/components/locale-switcher";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");

  const navigation = [
    { name: t("charxViewer"), href: "/charx" as const, icon: FileArchive },
    { name: t("charxPokebox"), href: "/pokebox" as const, icon: FolderHeart },
    { name: t("p2pShare"), href: "/p2p/share" as const, icon: Share2 },
    { name: t("connect"), href: "/p2p/connect" as const, icon: Users },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between sm:h-16">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Egg className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
            <span className="text-lg font-bold sm:text-xl">OpenTamago</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          {mounted ? (
            <ThemeToggle />
          ) : (
            <Skeleton className="h-9 w-9 rounded-md" />
          )}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="sm:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t("toggleMenu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle className="sr-only">{t("navigationMenu")}</SheetTitle>
              <nav className="flex flex-col gap-2 mt-8">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
