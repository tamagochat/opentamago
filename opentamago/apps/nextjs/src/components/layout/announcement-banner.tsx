"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  const t = useTranslations("announcement");

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-primary/90 to-primary text-primary-foreground">
      <div className="container flex items-center justify-center gap-2 py-2 text-center text-xs sm:text-sm">
        <MessageCircle className="hidden h-4 w-4 shrink-0 sm:block" />
        <p>
          <span className="font-semibold">{t("chatLaunchTitle")}</span>
          {" "}
          {t("chatLaunchDescription")}
          {" "}
          <a
            href="https://real.tamago.chat"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
          >
            {t("chatLaunchCta")}
          </a>
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 opacity-70 hover:opacity-100 transition-opacity"
          aria-label={t("dismiss")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
