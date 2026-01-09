"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home, FolderHeart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "~/i18n/routing";
import { Button } from "~/components/ui/button";

export default function PokeboxError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.pokebox");

  useEffect(() => {
    console.error("Pokebox page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-4 -mt-10 ml-auto mr-[calc(50%-3rem)] relative">
          <FolderHeart className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground mb-8">{t("description")}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {t("retry")}
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              {t("goHome")}
            </Link>
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 p-4 bg-muted rounded-lg text-left">
            <p className="text-xs font-mono text-muted-foreground break-all">
              {error.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
