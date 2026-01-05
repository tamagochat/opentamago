"use client";

import { Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { ErrorBoundary } from "~/components/error-boundary";
import { Skeleton } from "~/components/ui/skeleton";

interface MainLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
}

function HeaderFallback() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between sm:h-16">
        <div className="flex items-center gap-4 sm:gap-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24 hidden sm:block" />
        </div>
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </header>
  );
}

export function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  const t = useTranslations("charx.errorBoundary");

  // Extract string values first to prevent function reference changes from causing re-memoization
  const title = t("title");
  const description = t("description");
  const refreshPage = t("refreshPage");

  const errorBoundaryTranslations = useMemo(
    () => ({
      title,
      description,
      refreshPage,
    }),
    [title, description, refreshPage]
  );

  return (
    <div className="relative min-h-screen flex flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <ErrorBoundary translations={errorBoundaryTranslations}>
        <main className="flex-1">{children}</main>
      </ErrorBoundary>
      {showFooter && <SiteFooter />}
    </div>
  );
}
