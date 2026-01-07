"use client";

import { useState } from "react";
import { Settings, Globe, Palette, Moon, Sun, Monitor, MoreVertical } from "lucide-react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "~/i18n/routing";
import { locales, localeNames, type Locale } from "~/i18n/config";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "~/components/ui/dropdown-menu";
import { SettingsModal } from "~/components/settings-modal";

interface SettingsDropdownProps {
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
}

export function SettingsDropdown({ settingsOpen, onSettingsOpenChange }: SettingsDropdownProps) {
  const { theme, setTheme } = useTheme();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("theme");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLocaleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as Locale });
    setDropdownOpen(false);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setDropdownOpen(false);
  };

  const handleOpenSettings = () => {
    setDropdownOpen(false);
    onSettingsOpenChange?.(true);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Language submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Globe className="mr-2 h-4 w-4" />
              <span>Language</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {locales.map((loc) => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => handleLocaleChange(loc)}
                    className={locale === loc ? "bg-accent" : ""}
                  >
                    {localeNames[loc]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {/* Theme submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="mr-2 h-4 w-4" />
              <span>Theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => handleThemeChange("light")}
                  className={theme === "light" ? "bg-accent" : ""}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  {t("light")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleThemeChange("dark")}
                  className={theme === "dark" ? "bg-accent" : ""}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  {t("dark")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleThemeChange("system")}
                  className={theme === "system" ? "bg-accent" : ""}
                >
                  <Monitor className="mr-2 h-4 w-4" />
                  {t("system")}
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Settings option */}
          <DropdownMenuItem onClick={handleOpenSettings}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsModal open={settingsOpen} onOpenChange={onSettingsOpenChange} />
    </>
  );
}
