"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Key, Palette, Database } from "lucide-react";
import { useSettings, useProviderSettings } from "~/lib/db/hooks";
import type { ChatBubbleTheme } from "~/lib/db/schemas";
import { DatabaseTab } from "./database-tab";
import {
  ApiKeysTab,
  ChatUITab,
  type ApiKeysTabRef,
  type ChatUITabRef,
} from "./settings";
import {
  ALL_PROVIDERS,
  type Provider,
} from "~/lib/ai";
import { cn } from "~/lib/utils";
import { useMediaQuery } from "~/hooks/use-media-query";

export type SettingsSection = "apiKeys" | "chatUI" | "database";

interface SettingsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Tabs to hide from the settings modal */
  hiddenTabs?: SettingsSection[];
}

export function SettingsModal({ open, onOpenChange, hiddenTabs = [] }: SettingsModalProps) {
  const t = useTranslations("chat.settings");
  const tActions = useTranslations("actions");
  const { settings, updateSettings, isLoading } = useSettings();
  const {
    providers,
    isLoading: providersLoading,
    updateProviderSettings,
    isProviderReady,
  } = useProviderSettings();
  // Compute initial active section (first non-hidden tab)
  const getDefaultSection = (): SettingsSection => {
    const sections: SettingsSection[] = ["apiKeys", "chatUI", "database"];
    return sections.find((s) => !hiddenTabs.includes(s)) ?? "apiKeys";
  };
  const [activeSection, setActiveSection] = useState<SettingsSection>(getDefaultSection);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Refs to tab components
  const apiKeysTabRef = useRef<ApiKeysTabRef>(null);
  const chatUITabRef = useRef<ChatUITabRef>(null);

  // Initial values for tabs (computed from DB data)
  const [initialApiKeys, setInitialApiKeys] = useState<Record<Provider, string>>({
    gemini: "",
    openrouter: "",
    anthropic: "",
    grok: "",
    openai: "",
    nanogpt: "",
    zhipu: "",
    falai: "",
    elevenlabs: "",
  });

  const [initialChatBubbleTheme, setInitialChatBubbleTheme] = useState<ChatBubbleTheme>("roleplay");

  const [isSaving, setIsSaving] = useState(false);

  // Load provider settings from database (API keys only)
  useEffect(() => {
    if (!providersLoading && providers.size > 0) {
      const newApiKeys: Record<Provider, string> = {
        gemini: "",
        openrouter: "",
        anthropic: "",
        grok: "",
        openai: "",
        nanogpt: "",
        zhipu: "",
        falai: "",
        elevenlabs: "",
      };

      providers.forEach((providerSettings, providerId) => {
        newApiKeys[providerId] = providerSettings.apiKey ?? "";
      });

      setInitialApiKeys(newApiKeys);
    }
  }, [providersLoading, providers]);

  // Load settings from database (chat UI)
  useEffect(() => {
    if (!isLoading && settings) {
      setInitialChatBubbleTheme(settings.chatBubbleTheme ?? "roleplay");
    }
  }, [isLoading, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get data from tab refs
      const apiKeysData = apiKeysTabRef.current?.getSaveData() ?? initialApiKeys;
      const chatUIData = chatUITabRef.current?.getSaveData();

      // Save provider settings (API keys only)
      for (const providerId of ALL_PROVIDERS) {
        await updateProviderSettings(providerId, {
          apiKey: apiKeysData[providerId],
          enabled: !!apiKeysData[providerId],
        });
      }

      // Save chat UI settings
      if (chatUIData) {
        await updateSettings({ chatBubbleTheme: chatUIData.chatBubbleTheme });
      }

      toast.success(t("saved"));
    } finally {
      setIsSaving(false);
    }
  };

  const allSidebarItems = [
    { id: "apiKeys" as const, icon: Key, label: "API Keys" },
    { id: "chatUI" as const, icon: Palette, label: "Chat UI" },
    { id: "database" as const, icon: Database, label: "Database" },
  ];

  const sidebarItems = allSidebarItems.filter(
    (item) => !hiddenTabs.includes(item.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {/* <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button> */}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] p-0 gap-0 overflow-hidden flex flex-col" style={{ maxHeight: "min(85vh, 600px)" }} showCloseButton={false}>
        {isDesktop ? (
          // Desktop: Sidebar + Content layout
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-40 shrink-0 border-r bg-muted/30 flex flex-col">
              <div className="p-4 border-b">
                <DialogTitle className="font-semibold text-sm">{t("title")}</DialogTitle>
                <DialogDescription className="sr-only">
                  {t("description")}
                </DialogDescription>
              </div>
              <nav className="p-2 space-y-1 flex-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                      activeSection === item.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto">
                {activeSection === "apiKeys" && (
                  <ApiKeysTab
                    ref={apiKeysTabRef}
                    initialApiKeys={initialApiKeys}
                    isProviderReady={isProviderReady}
                  />
                )}
                {activeSection === "chatUI" && (
                  <ChatUITab
                    ref={chatUITabRef}
                    initialChatBubbleTheme={initialChatBubbleTheme}
                  />
                )}
                {activeSection === "database" && <DatabaseTab />}
              </div>

              {/* Footer */}
              <div className="flex shrink-0 justify-end gap-2 p-4 border-t bg-background">
                <Button variant="outline" onClick={() => onOpenChange?.(false)}>
                  {tActions("cancel")}
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t("saving") : tActions("save")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Mobile: Tabs layout
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-4 border-b">
              <DialogTitle className="font-semibold text-sm">{t("title")}</DialogTitle>
              <DialogDescription className="sr-only">
                {t("description")}
              </DialogDescription>
            </div>
            <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as SettingsSection)} className="flex flex-col flex-1 min-h-0">
              <div className="border-b px-2">
                <TabsList className="w-full h-auto justify-start gap-1 bg-transparent p-0">
                  {sidebarItems.map((item) => {
                    const iconOnly = item.id === "apiKeys";
                    return (
                      <TabsTrigger
                        key={item.id}
                        value={item.id}
                        className={cn(
                          "flex items-center gap-1.5 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                          iconOnly ? "px-2" : "px-3"
                        )}
                        title={item.label}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        {!iconOnly && <span className="truncate">{item.label}</span>}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <TabsContent value="apiKeys" className="mt-0">
                  <ApiKeysTab
                    ref={apiKeysTabRef}
                    initialApiKeys={initialApiKeys}
                    isProviderReady={isProviderReady}
                  />
                </TabsContent>
                <TabsContent value="chatUI" className="mt-0">
                  <ChatUITab
                    ref={chatUITabRef}
                    initialChatBubbleTheme={initialChatBubbleTheme}
                  />
                </TabsContent>
                <TabsContent value="database" className="mt-0">
                  <DatabaseTab />
                </TabsContent>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 justify-end gap-2 p-4 border-t bg-background">
                <Button variant="outline" onClick={() => onOpenChange?.(false)}>
                  {tActions("cancel")}
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? t("saving") : tActions("save")}
                </Button>
              </div>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
