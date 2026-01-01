import { getTranslations, getLocale, setRequestLocale } from "next-intl/server";
import { Egg, Home, FileArchive } from "lucide-react";
import { Link } from "~/i18n/routing";
import { Button } from "~/components/ui/button";

export default async function NotFound() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations("errors.notFound");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-6">
          <Egg className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-2">{t("title")}</h1>
        <h2 className="text-xl font-semibold mb-2">{t("heading")}</h2>
        <p className="text-muted-foreground mb-8">{t("description")}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              {t("goHome")}
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/charx">
              <FileArchive className="h-4 w-4" />
              {t("openCharxViewer")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
