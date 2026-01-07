"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Settings, Eye, EyeOff, Server, Key, MessageSquare, Database } from "lucide-react";
import { useSettings } from "~/lib/db/hooks";
import type { ApiMode, ChatBubbleTheme } from "~/lib/db/schemas";
import {
  SUPPORTED_MODELS,
  HARM_CATEGORIES,
  BLOCK_THRESHOLDS,
  HARM_CATEGORY_LABELS,
  DEFAULT_SAFETY_SETTINGS,
  type SafetySettings,
  type HarmCategory,
  type BlockThreshold,
} from "~/lib/ai";
import { cn } from "~/lib/utils";
import { DatabaseTab } from "./database-tab";
import { useMediaQuery } from "~/hooks/use-media-query";

type SettingsSection = "api" | "chatUI" | "database";

interface SettingsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const t = useTranslations("chat.settings");
  const tActions = useTranslations("actions");
  const { settings, updateSettings, isLoading } = useSettings();
  const [activeSection, setActiveSection] = useState<SettingsSection>("api");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  // Hide server API in Vercel production
  const isProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
  const [apiMode, setApiMode] = useState<ApiMode>("server");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState("gemini-3-flash-preview");
  const [temperature, setTemperature] = useState("0.9");
  const [maxTokens, setMaxTokens] = useState("4096");
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(DEFAULT_SAFETY_SETTINGS);
  const [chatBubbleTheme, setChatBubbleTheme] = useState<ChatBubbleTheme>("roleplay");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Force client mode in production, otherwise use saved setting
      const mode = settings.apiMode ?? "server";
      setApiMode(isProduction && mode === "server" ? "client" : mode);
      setApiKey(settings.geminiApiKey ?? "");
      setModel(settings.defaultModel);
      setTemperature(String(settings.temperature));
      setMaxTokens(String(settings.maxTokens));
      setSafetySettings(settings.safetySettings ?? DEFAULT_SAFETY_SETTINGS);
      setChatBubbleTheme(settings.chatBubbleTheme ?? "roleplay");
    }
  }, [isLoading, settings, isProduction]);

  const handleSafetyChange = (category: HarmCategory, threshold: BlockThreshold) => {
    setSafetySettings((prev) => ({
      ...prev,
      [category]: threshold,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        apiMode,
        geminiApiKey: apiKey || undefined,
        defaultModel: model,
        temperature: parseFloat(temperature),
        maxTokens: parseInt(maxTokens, 10),
        safetySettings,
        chatBubbleTheme,
      });
      onOpenChange?.(false);
    } finally {
      setIsSaving(false);
    }
  };

  const sidebarItems = [
    { id: "api" as const, icon: Key, label: t("apiSection") },
    { id: "chatUI" as const, icon: MessageSquare, label: t("chatUISection") },
    { id: "database" as const, icon: Database, label: t("databaseSection") },
  ];

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
              <ScrollArea className="flex-1 min-h-0">
              {activeSection === "api" && (
                <Tabs defaultValue="apiKey" className="w-full">
                  <div className="px-4 pt-4 pb-2 border-b">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="apiKey">{t("apiKeySection")}</TabsTrigger>
                      <TabsTrigger value="safety">{t("safety")}</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="apiKey" className="mt-0 p-4 space-y-4">
                    {/* API Mode Selection */}
                    {!isProduction && (
                      <div className="grid gap-3">
                        <Label>{t("apiMode")}</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setApiMode("server")}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                              apiMode === "server"
                                ? "border-primary bg-primary/5"
                                : "border-muted hover:border-muted-foreground/50"
                            )}
                          >
                            <Server className={cn("h-5 w-5", apiMode === "server" ? "text-primary" : "text-muted-foreground")} />
                            <div className="text-center">
                              <p className="font-medium text-sm">{t("apiModeServer")}</p>
                              <p className="text-xs text-muted-foreground">{t("apiModeServerDesc")}</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setApiMode("client")}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                              apiMode === "client"
                                ? "border-primary bg-primary/5"
                                : "border-muted hover:border-muted-foreground/50"
                            )}
                          >
                            <Key className={cn("h-5 w-5", apiMode === "client" ? "text-primary" : "text-muted-foreground")} />
                            <div className="text-center">
                              <p className="font-medium text-sm">{t("apiModeClient")}</p>
                              <p className="text-xs text-muted-foreground">{t("apiModeClientDesc")}</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* API Key (show in client mode or production) */}
                    {(apiMode === "client" || isProduction) && (
                      <div className="grid gap-2">
                        <Label htmlFor="apiKey">{t("geminiApiKey")}</Label>
                        <div className="relative">
                          <Input
                            id="apiKey"
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={t("enterApiKey")}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {t("getApiKey")}{" "}
                          <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            Google AI Studio
                          </a>
                        </p>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="model">{t("defaultModel")}</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectModel")} />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_MODELS.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="temperature">{t("temperature")}</Label>
                        <Input
                          id="temperature"
                          type="number"
                          min="0"
                          max="2"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="maxTokens">{t("maxTokens")}</Label>
                        <Input
                          id="maxTokens"
                          type="number"
                          min="1"
                          max="8192"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(e.target.value)}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="safety" className="mt-0 p-4 space-y-4">
                    <p className="text-muted-foreground text-xs">{t("safetyDescription")}</p>

                    {HARM_CATEGORIES.map((category) => (
                      <div key={category} className="grid gap-2">
                        <Label htmlFor={category}>{HARM_CATEGORY_LABELS[category]}</Label>
                        <Select
                          value={safetySettings[category]}
                          onValueChange={(value: BlockThreshold) => handleSafetyChange(category, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BLOCK_THRESHOLDS.map((threshold) => (
                              <SelectItem key={threshold.id} value={threshold.id}>
                                {threshold.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              )}

              {activeSection === "chatUI" && (
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-1">{t("chatUISection")}</h3>
                    <p className="text-muted-foreground text-xs">{t("chatUIDescription")}</p>
                  </div>

                  {/* Chat Bubble Theme */}
                  <div className="grid gap-3">
                    <Label>{t("bubbleTheme")}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setChatBubbleTheme("roleplay")}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border-2 p-4 transition-colors",
                          chatBubbleTheme === "roleplay"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/50"
                        )}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{t("themeRoleplay")}</p>
                          <p className="text-xs text-muted-foreground">{t("themeRoleplayDesc")}</p>
                        </div>
                        {/* Preview */}
                        <div className="bg-muted rounded-lg p-2 text-xs space-y-1">
                          <p><span className="text-primary">&quot;Hello!&quot;</span> she said softly.</p>
                          <p className="border-l-2 border-muted-foreground/30 pl-2 text-muted-foreground italic">*smiles warmly*</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatBubbleTheme("messenger")}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border-2 p-4 transition-colors",
                          chatBubbleTheme === "messenger"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/50"
                        )}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{t("themeMessenger")}</p>
                          <p className="text-xs text-muted-foreground">{t("themeMessengerDesc")}</p>
                        </div>
                        {/* Preview */}
                        <div className="bg-muted rounded-lg p-2 text-xs">
                          <p>&quot;Hello!&quot; she said softly.</p>
                          <p>*smiles warmly*</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "database" && <DatabaseTab />}
            </ScrollArea>

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
                  {sidebarItems.map((item) => (
                    <TabsTrigger
                      key={item.id}
                      value={item.id}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <TabsContent value="api" className="mt-0">
                  <Tabs defaultValue="apiKey" className="w-full">
                    <div className="px-4 pt-4 pb-2 border-b">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="apiKey">{t("apiKeySection")}</TabsTrigger>
                        <TabsTrigger value="safety">{t("safety")}</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="apiKey" className="mt-0 p-4 space-y-4">
                      {/* API Mode Selection */}
                      {!isProduction && (
                        <div className="grid gap-3">
                          <Label>{t("apiMode")}</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setApiMode("server")}
                              className={cn(
                                "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                                apiMode === "server"
                                  ? "border-primary bg-primary/5"
                                  : "border-muted hover:border-muted-foreground/50"
                              )}
                            >
                              <Server className={cn("h-5 w-5", apiMode === "server" ? "text-primary" : "text-muted-foreground")} />
                              <div className="text-center">
                                <p className="font-medium text-sm">{t("apiModeServer")}</p>
                                <p className="text-xs text-muted-foreground">{t("apiModeServerDesc")}</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setApiMode("client")}
                              className={cn(
                                "flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors",
                                apiMode === "client"
                                  ? "border-primary bg-primary/5"
                                  : "border-muted hover:border-muted-foreground/50"
                              )}
                            >
                              <Key className={cn("h-5 w-5", apiMode === "client" ? "text-primary" : "text-muted-foreground")} />
                              <div className="text-center">
                                <p className="font-medium text-sm">{t("apiModeClient")}</p>
                                <p className="text-xs text-muted-foreground">{t("apiModeClientDesc")}</p>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* API Key (show in client mode or production) */}
                      {(apiMode === "client" || isProduction) && (
                        <div className="grid gap-2">
                          <Label htmlFor="apiKey">{t("geminiApiKey")}</Label>
                          <div className="relative">
                            <Input
                              id="apiKey"
                              type={showApiKey ? "text" : "password"}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder={t("enterApiKey")}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowApiKey(!showApiKey)}
                            >
                              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {t("getApiKey")}{" "}
                            <a
                              href="https://aistudio.google.com/apikey"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              Google AI Studio
                            </a>
                          </p>
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label htmlFor="model">{t("defaultModel")}</Label>
                        <Select value={model} onValueChange={setModel}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectModel")} />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_MODELS.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="temperature">{t("temperature")}</Label>
                          <Input
                            id="temperature"
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            value={temperature}
                            onChange={(e) => setTemperature(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="maxTokens">{t("maxTokens")}</Label>
                          <Input
                            id="maxTokens"
                            type="number"
                            min="1"
                            max="8192"
                            value={maxTokens}
                            onChange={(e) => setMaxTokens(e.target.value)}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="safety" className="mt-0 p-4 space-y-4">
                      <p className="text-muted-foreground text-xs">{t("safetyDescription")}</p>

                      {HARM_CATEGORIES.map((category) => (
                        <div key={category} className="grid gap-2">
                          <Label htmlFor={category}>{HARM_CATEGORY_LABELS[category]}</Label>
                          <Select
                            value={safetySettings[category]}
                            onValueChange={(value: BlockThreshold) => handleSafetyChange(category, value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOCK_THRESHOLDS.map((threshold) => (
                                <SelectItem key={threshold.id} value={threshold.id}>
                                  {threshold.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </TabsContent>

                <TabsContent value="chatUI" className="mt-0 p-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-1">{t("chatUISection")}</h3>
                    <p className="text-muted-foreground text-xs">{t("chatUIDescription")}</p>
                  </div>

                  {/* Chat Bubble Theme */}
                  <div className="grid gap-3">
                    <Label>{t("bubbleTheme")}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setChatBubbleTheme("roleplay")}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border-2 p-4 transition-colors",
                          chatBubbleTheme === "roleplay"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/50"
                        )}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{t("themeRoleplay")}</p>
                          <p className="text-xs text-muted-foreground">{t("themeRoleplayDesc")}</p>
                        </div>
                        {/* Preview */}
                        <div className="bg-muted rounded-lg p-2 text-xs space-y-1">
                          <p><span className="text-primary">&quot;Hello!&quot;</span> she said softly.</p>
                          <p className="border-l-2 border-muted-foreground/30 pl-2 text-muted-foreground italic">*smiles warmly*</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatBubbleTheme("messenger")}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border-2 p-4 transition-colors",
                          chatBubbleTheme === "messenger"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/50"
                        )}
                      >
                        <div className="text-left">
                          <p className="font-medium text-sm">{t("themeMessenger")}</p>
                          <p className="text-xs text-muted-foreground">{t("themeMessengerDesc")}</p>
                        </div>
                        {/* Preview */}
                        <div className="bg-muted rounded-lg p-2 text-xs">
                          <p>&quot;Hello!&quot; she said softly.</p>
                          <p>*smiles warmly*</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="database" className="mt-0">
                  <DatabaseTab />
                </TabsContent>
              </ScrollArea>

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
