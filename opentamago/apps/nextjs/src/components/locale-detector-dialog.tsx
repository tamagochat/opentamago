"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "~/i18n/routing";
import { locales, localeNames, type Locale } from "~/i18n/config";
import { useSettings } from "~/lib/db/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Languages } from "lucide-react";

export function LocaleDetectorDialog() {
  const currentLocale = useLocale() as Locale;
  const t = useTranslations("localeDetector");
  const router = useRouter();
  const pathname = usePathname();
  const { settings, updateSettings, isLoading } = useSettings();

  const [open, setOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState<Locale>(currentLocale);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // Detect browser preferred language
  const detectBrowserLocale = (): Locale | null => {
    if (typeof navigator === "undefined") return null;

    // Get browser languages in order of preference
    const browserLanguages = navigator.languages || [navigator.language];

    for (const lang of browserLanguages) {
      // Extract base language code (e.g., "en" from "en-US")
      const baseLocale = lang.split("-")[0]?.toLowerCase();

      // Check if we support this locale
      if (locales.includes(baseLocale as Locale)) {
        return baseLocale as Locale;
      }
    }

    return null; // No matching locale found
  };

  // Determine if dialog should be shown
  useEffect(() => {
    if (isLoading) return; // Wait for settings to load

    // Don't show if already dismissed
    if (settings.localeDialogDismissed) return;

    const browserLocale = detectBrowserLocale();

    // Don't show if no browser locale detected
    if (!browserLocale) return;

    // Don't show if browser locale matches current page locale
    if (browserLocale === currentLocale) return;

    // Show dialog and pre-select detected locale
    setSelectedLocale(browserLocale);
    setOpen(true);

    // Update last shown timestamp (optional, for analytics)
    void updateSettings({ localeDialogShownAt: Date.now() });
  }, [isLoading, settings.localeDialogDismissed, currentLocale, updateSettings]);

  const handleContinue = async () => {
    // If "don't show again" is checked, persist dismissal
    if (dontShowAgain) {
      await updateSettings({ localeDialogDismissed: true });
    }

    // Switch to selected locale
    if (selectedLocale !== currentLocale) {
      router.replace(pathname, { locale: selectedLocale });
    }

    setOpen(false);
  };

  const handleDismiss = async () => {
    // If "don't show again" is checked, persist dismissal
    if (dontShowAgain) {
      await updateSettings({ localeDialogDismissed: true });
    }

    setOpen(false);
  };

  // Don't render if loading
  if (isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Locale Selector */}
          <div className="grid gap-2">
            <Label htmlFor="locale-select">{t("selectLanguage")}</Label>
            <Select
              value={selectedLocale}
              onValueChange={(val) => setSelectedLocale(val as Locale)}
            >
              <SelectTrigger id="locale-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locales.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {localeNames[locale]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Don't show again checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label
              htmlFor="dont-show-again"
              className="text-sm font-normal cursor-pointer"
            >
              {t("dontShowAgain")}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDismiss}>
            {t("stayHere")}
          </Button>
          <Button onClick={handleContinue}>{t("continue")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
