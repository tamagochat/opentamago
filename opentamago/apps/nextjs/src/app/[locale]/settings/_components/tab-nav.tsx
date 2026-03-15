"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "~/i18n/routing";
import { cn } from "~/lib/utils";

type TabType = "personas" | "api-keys" | "models" | "database" | "contact";

interface Tab {
  id: TabType;
  href: string;
  labelKey: string;
}

const TABS: Tab[] = [
  { id: "personas", href: "/settings/personas", labelKey: "tabs.personas" },
  { id: "api-keys", href: "/settings/api-keys", labelKey: "tabs.apiKeys" },
  { id: "models", href: "/settings/models", labelKey: "tabs.models" },
  { id: "database", href: "/settings/database", labelKey: "tabs.database" },
  { id: "contact", href: "/settings/contact", labelKey: "tabs.contact" },
];

interface SettingsTabNavProps {
  currentTab: TabType;
}

export const SettingsTabNav = memo(function SettingsTabNav({ currentTab }: SettingsTabNavProps) {
  const t = useTranslations("settings");

  return (
    <nav className="flex gap-1 p-1 bg-muted/50 rounded-lg overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = currentTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {t(tab.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
});
