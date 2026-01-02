"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
import { Settings, Eye, EyeOff, Server, Key } from "lucide-react";
import { useSettings } from "~/lib/db/hooks";
import type { ApiMode } from "~/lib/db/schemas";
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

interface SettingsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const t = useTranslations("chat.settings");
  const tActions = useTranslations("actions");
  const { settings, updateSettings, isLoading } = useSettings();
  const [apiMode, setApiMode] = useState<ApiMode>("server");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [model, setModel] = useState("gemini-3-flash-preview");
  const [temperature, setTemperature] = useState("0.9");
  const [maxTokens, setMaxTokens] = useState("4096");
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(DEFAULT_SAFETY_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setApiMode(settings.apiMode ?? "server");
      setApiKey(settings.geminiApiKey ?? "");
      setModel(settings.defaultModel);
      setTemperature(String(settings.temperature));
      setMaxTokens(String(settings.maxTokens));
      setSafetySettings(settings.safetySettings ?? DEFAULT_SAFETY_SETTINGS);
    }
  }, [isLoading, settings]);

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
      });
      onOpenChange?.(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">{t("general")}</TabsTrigger>
            <TabsTrigger value="safety">{t("safety")}</TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[calc(90vh-280px)]">
            <TabsContent value="general" className="mt-4 space-y-4">
              {/* API Mode Selection */}
              <div className="grid gap-3">
                <Label>{t("apiMode")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setApiMode("server")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                      apiMode === "server"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/50"
                    }`}
                  >
                    <Server className={`h-6 w-6 ${apiMode === "server" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className="font-medium text-sm">{t("apiModeServer")}</p>
                      <p className="text-xs text-muted-foreground">{t("apiModeServerDesc")}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApiMode("client")}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                      apiMode === "client"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/50"
                    }`}
                  >
                    <Key className={`h-6 w-6 ${apiMode === "client" ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-center">
                      <p className="font-medium text-sm">{t("apiModeClient")}</p>
                      <p className="text-xs text-muted-foreground">{t("apiModeClientDesc")}</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* API Key (only show in client mode) */}
              {apiMode === "client" && (
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

            <TabsContent value="safety" className="mt-4 space-y-4">
              <p className="text-muted-foreground text-sm">{t("safetyDescription")}</p>

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
          </ScrollArea>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            {tActions("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("saving") : tActions("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
