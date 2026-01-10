"use client";

import { useState, useEffect } from "react";
import { Egg, FileArchive, FolderHeart, Menu, Pencil, Share2, Users } from "lucide-react";
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "~/components/ui/navigation-menu";
import { cn } from "~/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");

  const charxItems = [
    { name: t("charxViewer"), href: "/charx" as const, icon: FileArchive, description: "View and explore CharX files" },
    { name: t("charxEditor"), href: "/charx/editor" as const, icon: Pencil, description: "Create and edit characters" },
    { name: t("charxPokebox"), href: "/pokebox" as const, icon: FolderHeart, description: "Your character collection" },
  ];

  const p2pItems = [
    { name: t("p2pShare"), href: "/p2p/share" as const, icon: Share2 },
    { name: t("connect"), href: "/p2p/connect" as const, icon: Users },
  ];

  // All items for mobile menu
  const allNavItems = [...charxItems, ...p2pItems];

  const isCharxActive = pathname.startsWith("/charx") || pathname.startsWith("/pokebox");

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

          {/* Desktop Navigation with Shadcn Navigation Menu */}
          <NavigationMenu className="hidden sm:flex">
            <NavigationMenuList>
              {/* CharX Dropdown */}
              <NavigationMenuItem>
                <NavigationMenuTrigger
                  className={cn(
                    "text-sm font-medium",
                    isCharxActive && "bg-accent text-accent-foreground"
                  )}
                >
                  {t("charx")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[280px] gap-1 p-2">
                    {charxItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-start gap-3 rounded-md p-3 transition-colors hover:bg-accent",
                                isActive && "bg-accent"
                              )}
                            >
                              <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">{item.name}</span>
                                <span className="text-xs text-muted-foreground">{item.description}</span>
                              </div>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      );
                    })}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* P2P Links (flat, no dropdown) */}
              {p2pItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                          isActive && "bg-accent text-accent-foreground"
                        )}
                      >
                        {item.name}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                );
              })}
            </NavigationMenuList>
          </NavigationMenu>
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
                {/* CharX Section */}
                <div className="px-4 py-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("charx")}</span>
                </div>
                {charxItems.map((item) => {
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

                {/* P2P Section */}
                <div className="px-4 py-2 mt-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">P2P</span>
                </div>
                {p2pItems.map((item) => {
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
