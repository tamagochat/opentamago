"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Image, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  TextTab,
  ImageTab,
  VoiceTab,
  type TextTabRef,
  type ImageTabRef,
  type VoiceTabRef,
  type TextScenarioState,
} from "~/components/settings";
import { useGenerationSettings } from "~/lib/db/hooks";
import { DEFAULT_SAFETY_SETTINGS } from "~/lib/ai";
import type { TextProvider, ImageProvider, VoiceProvider, AspectRatio, Resolution, Provider } from "~/lib/ai/providers";

type SubTab = "text" | "image" | "voice";

interface ModelsTabProps {
  isProviderReady: (providerId: Provider) => boolean;
}

export function ModelsTab({ isProviderReady }: ModelsTabProps) {
  const t = useTranslations("settings");
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("text");
  const {
    getSettings,
    updateSettings,
    isLoading,
  } = useGenerationSettings();

  // Refs for each tab
  const textTabRef = useRef<TextTabRef>(null);
  const imageTabRef = useRef<ImageTabRef>(null);
  const voiceTabRef = useRef<VoiceTabRef>(null);

  // Build initial states from generation settings
  const buildTextScenarioState = (
    id: "text_chat" | "text_translation" | "text_hitmeup" | "text_aibot"
  ): TextScenarioState => {
    const settings = getSettings(id);
    return {
      enabled: settings?.enabled ?? true,
      provider: (settings?.providerId ?? "gemini") as TextProvider,
      model: settings?.model ?? "",
      temperature: String(settings?.temperature ?? 0.9),
      maxTokens: String(settings?.maxTokens ?? 4096),
      thinking: settings?.thinking ?? false,
      safetySettings: settings?.metadata?.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
      targetLanguage: settings?.metadata?.targetLanguage,
    };
  };

  const initialChat = buildTextScenarioState("text_chat");
  const initialTranslation = buildTextScenarioState("text_translation");
  const initialHitmeup = buildTextScenarioState("text_hitmeup");
  const initialAibot = buildTextScenarioState("text_aibot");

  const imageSettings = getSettings("image");
  const initialImageEnabled = imageSettings?.enabled ?? true;
  const initialImageProvider = (imageSettings?.providerId ?? "falai") as ImageProvider;
  const initialImageModel = imageSettings?.model ?? "";
  const initialAspectRatio = (imageSettings?.aspectRatio as AspectRatio) ?? "1:1";
  const initialResolution = (imageSettings?.resolution as Resolution) ?? "2K";

  const voiceSettings = getSettings("voice");
  const initialVoiceEnabled = voiceSettings?.enabled ?? true;
  const initialVoiceProvider = (voiceSettings?.providerId ?? "elevenlabs") as VoiceProvider;
  const initialVoiceModel = voiceSettings?.model ?? "";
  const initialVoiceName = voiceSettings?.voiceName;
  const initialVoiceLanguage = voiceSettings?.voiceLanguage;

  // Save handlers for auto-save
  const handleTextSave = async () => {
    const data = textTabRef.current?.getSaveData();
    if (!data) return;

    // Save each scenario
    await Promise.all([
      updateSettings("text_chat", {
        enabled: data.chat.enabled,
        providerId: data.chat.provider,
        model: data.chat.model,
        temperature: parseFloat(data.chat.temperature),
        maxTokens: parseInt(data.chat.maxTokens),
        thinking: data.chat.thinking,
        metadata: { safetySettings: data.chat.safetySettings },
      }),
      updateSettings("text_translation", {
        enabled: data.translation.enabled,
        providerId: data.translation.provider,
        model: data.translation.model,
        temperature: parseFloat(data.translation.temperature),
        maxTokens: parseInt(data.translation.maxTokens),
        thinking: data.translation.thinking,
        metadata: {
          safetySettings: data.translation.safetySettings,
          targetLanguage: data.translation.targetLanguage,
        },
      }),
      updateSettings("text_hitmeup", {
        enabled: data.hitmeup.enabled,
        providerId: data.hitmeup.provider,
        model: data.hitmeup.model,
        temperature: parseFloat(data.hitmeup.temperature),
        maxTokens: parseInt(data.hitmeup.maxTokens),
        thinking: data.hitmeup.thinking,
        metadata: { safetySettings: data.hitmeup.safetySettings },
      }),
      updateSettings("text_aibot", {
        enabled: data.aibot.enabled,
        providerId: data.aibot.provider,
        model: data.aibot.model,
        temperature: parseFloat(data.aibot.temperature),
        maxTokens: parseInt(data.aibot.maxTokens),
        thinking: data.aibot.thinking,
        metadata: { safetySettings: data.aibot.safetySettings },
      }),
    ]);
  };

  const handleImageSave = async () => {
    const data = imageTabRef.current?.getSaveData();
    if (!data) return;

    await updateSettings("image", {
      enabled: data.enabled,
      providerId: data.provider,
      model: data.model,
      aspectRatio: data.aspectRatio,
      resolution: data.resolution,
    });
  };

  const handleVoiceSave = async () => {
    const data = voiceTabRef.current?.getSaveData();
    if (!data) return;

    await updateSettings("voice", {
      enabled: data.enabled,
      providerId: data.provider,
      model: data.model,
      voiceName: data.voiceName,
      voiceLanguage: data.voiceLanguage,
    });
  };

  const subTabs = [
    { id: "text" as const, icon: MessageSquare, label: "Text" },
    { id: "image" as const, icon: Image, label: "Image" },
    { id: "voice" as const, icon: Volume2, label: "Voice" },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tabs.models")}</CardTitle>
        <CardDescription>
          Configure AI providers and models for text, image, and voice generation.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {/* Sub-tab navigation */}
        <div className="flex border-b px-4">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeSubTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub-tab content */}
        <div className="p-6">
          {activeSubTab === "text" && (
            <div className="space-y-4">
              <TextTab
                ref={textTabRef}
                initialChat={initialChat}
                initialTranslation={initialTranslation}
                initialHitmeup={initialHitmeup}
                initialAibot={initialAibot}
                isProviderReady={isProviderReady as (id: TextProvider) => boolean}
              />
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleTextSave}>Save Text Settings</Button>
              </div>
            </div>
          )}

          {activeSubTab === "image" && (
            <div className="space-y-4">
              <ImageTab
                ref={imageTabRef}
                initialEnabled={initialImageEnabled}
                initialProvider={initialImageProvider}
                initialModel={initialImageModel}
                initialAspectRatio={initialAspectRatio}
                initialResolution={initialResolution}
                isProviderReady={isProviderReady as (id: ImageProvider) => boolean}
              />
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleImageSave}>Save Image Settings</Button>
              </div>
            </div>
          )}

          {activeSubTab === "voice" && (
            <div className="space-y-4">
              <VoiceTab
                ref={voiceTabRef}
                initialEnabled={initialVoiceEnabled}
                initialProvider={initialVoiceProvider}
                initialModel={initialVoiceModel}
                initialVoiceName={initialVoiceName}
                initialVoiceLanguage={initialVoiceLanguage}
                isProviderReady={isProviderReady as (id: VoiceProvider) => boolean}
              />
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleVoiceSave}>Save Voice Settings</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
