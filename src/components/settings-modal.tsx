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
import { Key, MessageSquare, Image, Volume2, Palette, Database } from "lucide-react";
import { useSettings, useProviderSettings, useGenerationSettings } from "~/lib/db/hooks";
import type { ChatBubbleTheme } from "~/lib/db/schemas";
import { DatabaseTab } from "./database-tab";
import {
  ApiKeysTab,
  TextTab,
  ImageTab,
  VoiceTab,
  ChatUITab,
  type ApiKeysTabRef,
  type TextTabRef,
  type ImageTabRef,
  type VoiceTabRef,
  type ChatUITabRef,
  type TextScenarioState,
} from "./settings";
import {
  DEFAULT_SAFETY_SETTINGS,
  ALL_PROVIDERS,
  IMAGE_PROVIDERS,
  VOICE_PROVIDERS,
  TEXT_PROVIDERS,
  TEXT_MODEL_CONFIGS,
  type Provider,
  type TextProvider,
  type ImageProvider,
  type VoiceProvider,
  type AspectRatio,
  type Resolution,
} from "~/lib/ai";
import { cn } from "~/lib/utils";
import { useMediaQuery } from "~/hooks/use-media-query";

type SettingsSection = "apiKeys" | "text" | "image" | "voice" | "chatUI" | "database";

interface SettingsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide specific text scenarios (e.g., ["translation"] to hide translation scenario) */
  hideTextScenarios?: string[];
  /** Hide thinking toggle in text scenarios */
  hideThinking?: boolean;
}

export function SettingsModal({ open, onOpenChange, hideTextScenarios, hideThinking }: SettingsModalProps) {
  const t = useTranslations("chat.settings");
  const tActions = useTranslations("actions");
  const { settings, updateSettings, isLoading } = useSettings();
  const {
    providers,
    isLoading: providersLoading,
    updateProviderSettings,
    isProviderReady,
  } = useProviderSettings();
  const {
    settings: generationSettings,
    isLoading: generationLoading,
    updateSettings: updateGenerationSettings,
  } = useGenerationSettings();
  const [activeSection, setActiveSection] = useState<SettingsSection>("apiKeys");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Refs to tab components
  const apiKeysTabRef = useRef<ApiKeysTabRef>(null);
  const textTabRef = useRef<TextTabRef>(null);
  const imageTabRef = useRef<ImageTabRef>(null);
  const voiceTabRef = useRef<VoiceTabRef>(null);
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

  // Default text scenario state
  const defaultTextScenario: TextScenarioState = {
    enabled: true,
    provider: "gemini",
    model: "",
    temperature: "0.9",
    maxTokens: "4096",
    thinking: false,
    safetySettings: DEFAULT_SAFETY_SETTINGS,
  };

  const [initialChatSettings, setInitialChatSettings] = useState<TextScenarioState>(defaultTextScenario);
  const [initialTranslationSettings, setInitialTranslationSettings] = useState<TextScenarioState>({
    ...defaultTextScenario,
    temperature: "0.3",
    maxTokens: "2048",
    targetLanguage: "en",
  });
  const [initialHitmeupSettings, setInitialHitmeupSettings] = useState<TextScenarioState>({
    ...defaultTextScenario,
    temperature: "1.0",
    maxTokens: "512",
  });
  const [initialAibotSettings, setInitialAibotSettings] = useState<TextScenarioState>({
    ...defaultTextScenario,
    temperature: "0.1",
    maxTokens: "2048",
  });

  const [initialImageEnabled, setInitialImageEnabled] = useState(true);
  const [initialImageProvider, setInitialImageProvider] = useState<ImageProvider>("falai");
  const [initialImageModel, setInitialImageModel] = useState("");
  const [initialAspectRatio, setInitialAspectRatio] = useState<AspectRatio>("1:1");
  const [initialResolution, setInitialResolution] = useState<Resolution>("2K");

  const [initialVoiceEnabled, setInitialVoiceEnabled] = useState(true);
  const [initialVoiceProvider, setInitialVoiceProvider] = useState<VoiceProvider>("elevenlabs");
  const [initialVoiceModel, setInitialVoiceModel] = useState("");
  const [initialVoiceName, setInitialVoiceName] = useState<string | undefined>(undefined);
  const [initialVoiceLanguage, setInitialVoiceLanguage] = useState<string | undefined>(undefined);

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

  // Load generation settings from database
  useEffect(() => {
    if (!generationLoading && generationSettings.size > 0) {
      // Helper to load text scenario settings
      const loadTextScenario = (id: "text_chat" | "text_translation" | "text_hitmeup" | "text_aibot"): TextScenarioState | null => {
        const genSettings = generationSettings.get(id);
        if (!genSettings) return null;

        // Get safety settings from generation metadata if using Gemini
        let safetySettings = DEFAULT_SAFETY_SETTINGS;
        if (genSettings.providerId === "gemini" && genSettings.metadata?.safetySettings) {
          safetySettings = genSettings.metadata.safetySettings as typeof DEFAULT_SAFETY_SETTINGS;
        }

        return {
          enabled: genSettings.enabled ?? true,
          provider: (genSettings.providerId as TextProvider) || "gemini",
          model: genSettings.model ?? "",
          temperature: String(genSettings.temperature ?? 0.9),
          maxTokens: String(genSettings.maxTokens ?? 4096),
          thinking: genSettings.thinking ?? false,
          safetySettings,
          targetLanguage: genSettings.metadata?.targetLanguage as string | undefined,
        };
      };

      // Load chat settings
      const chat = loadTextScenario("text_chat");
      if (chat) setInitialChatSettings(chat);

      // Load translation settings
      const translation = loadTextScenario("text_translation");
      if (translation) setInitialTranslationSettings(translation);

      // Load hitmeup settings
      const hitmeup = loadTextScenario("text_hitmeup");
      if (hitmeup) setInitialHitmeupSettings(hitmeup);

      // Load aibot settings
      const aibot = loadTextScenario("text_aibot");
      if (aibot) setInitialAibotSettings(aibot);

      // Load image settings
      const imgSettings = generationSettings.get("image");
      if (imgSettings) {
        setInitialImageEnabled(imgSettings.enabled ?? true);
        setInitialImageModel(imgSettings.model ?? "");
        setInitialAspectRatio((imgSettings.aspectRatio as AspectRatio) ?? "1:1");
        setInitialResolution((imgSettings.resolution as Resolution) ?? "2K");
        if (imgSettings.providerId && IMAGE_PROVIDERS.includes(imgSettings.providerId as ImageProvider)) {
          setInitialImageProvider(imgSettings.providerId as ImageProvider);
        }
      }

      // Load voice settings
      const voiceSettings = generationSettings.get("voice");
      if (voiceSettings) {
        setInitialVoiceEnabled(voiceSettings.enabled ?? true);
        setInitialVoiceModel(voiceSettings.model ?? "");
        setInitialVoiceName(voiceSettings.voiceName);
        setInitialVoiceLanguage(voiceSettings.voiceLanguage);
        if (voiceSettings.providerId && VOICE_PROVIDERS.includes(voiceSettings.providerId as VoiceProvider)) {
          setInitialVoiceProvider(voiceSettings.providerId as VoiceProvider);
        }
      }
    }
  }, [generationLoading, generationSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get data from tab refs
      const apiKeysData = apiKeysTabRef.current?.getSaveData() ?? initialApiKeys;
      const textData = textTabRef.current?.getSaveData();
      const imageData = imageTabRef.current?.getSaveData();
      const voiceData = voiceTabRef.current?.getSaveData();
      const chatUIData = chatUITabRef.current?.getSaveData();

      // Check if this is the first text provider API key being added
      const previousTextProvidersWithKeys = TEXT_PROVIDERS.filter(
        (p) => initialApiKeys[p]?.trim()
      );
      const newTextProvidersWithKeys = TEXT_PROVIDERS.filter(
        (p) => apiKeysData[p]?.trim()
      );

      // Find the first newly added text provider API key
      let firstNewTextProvider: TextProvider | null = null;
      if (previousTextProvidersWithKeys.length === 0 && newTextProvidersWithKeys.length > 0) {
        // This is the first text provider key - use the first one that was added
        firstNewTextProvider = newTextProvidersWithKeys[0] ?? null;
      }

      // Save provider settings (API keys only)
      for (const providerId of ALL_PROVIDERS) {
        await updateProviderSettings(providerId, {
          apiKey: apiKeysData[providerId],
          enabled: !!apiKeysData[providerId],
        });
      }

      // Save text generation settings for each scenario
      // If first API key added, override provider in all text scenarios
      if (textData) {
        const textScenarios = [
          { id: "text_chat" as const, settings: textData.chat },
          { id: "text_translation" as const, settings: textData.translation },
          { id: "text_hitmeup" as const, settings: textData.hitmeup },
          { id: "text_aibot" as const, settings: textData.aibot },
        ];

        for (const { id, settings: scenarioSettings } of textScenarios) {
          // Build metadata object
          const metadata: Record<string, unknown> = {};

          // Determine provider and model to use
          // If first API key was added, override with that provider
          const effectiveProvider = firstNewTextProvider ?? scenarioSettings.provider;
          const effectiveModel = firstNewTextProvider
            ? TEXT_MODEL_CONFIGS[firstNewTextProvider].defaultModel
            : scenarioSettings.model;

          // Include safety settings when using Gemini
          if (effectiveProvider === "gemini") {
            metadata.safetySettings = scenarioSettings.safetySettings;
          }

          // Include target language for translation scenario
          if (id === "text_translation" && scenarioSettings.targetLanguage) {
            metadata.targetLanguage = scenarioSettings.targetLanguage;
          }

          await updateGenerationSettings(id, {
            enabled: scenarioSettings.enabled,
            providerId: effectiveProvider,
            model: effectiveModel,
            temperature: parseFloat(scenarioSettings.temperature) || 0.9,
            maxTokens: parseInt(scenarioSettings.maxTokens, 10) || 4096,
            thinking: scenarioSettings.thinking,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          });
        }
      } else if (firstNewTextProvider) {
        // User added first API key but didn't visit text tab - auto-configure all text scenarios
        const defaultModel = TEXT_MODEL_CONFIGS[firstNewTextProvider].defaultModel;
        const textScenarioIds = ["text_chat", "text_translation", "text_hitmeup", "text_aibot"] as const;

        for (const id of textScenarioIds) {
          await updateGenerationSettings(id, {
            enabled: true,
            providerId: firstNewTextProvider,
            model: defaultModel,
          });
        }
      }

      // Save image generation settings
      if (imageData) {
        await updateGenerationSettings("image", {
          enabled: imageData.enabled,
          providerId: imageData.provider,
          model: imageData.model,
          aspectRatio: imageData.aspectRatio,
          resolution: imageData.resolution,
        });
      }

      // Save voice/TTS settings
      if (voiceData) {
        await updateGenerationSettings("voice", {
          enabled: voiceData.enabled,
          providerId: voiceData.provider,
          model: voiceData.model,
          voiceName: voiceData.voiceName,
          voiceLanguage: voiceData.voiceLanguage,
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

  const sidebarItems = [
    { id: "apiKeys" as const, icon: Key, label: "API Keys" },
    { id: "text" as const, icon: MessageSquare, label: "Text" },
    { id: "image" as const, icon: Image, label: "Image" },
    { id: "voice" as const, icon: Volume2, label: "Voice" },
    { id: "chatUI" as const, icon: Palette, label: "Chat UI" },
    { id: "database" as const, icon: Database, label: "Database" },
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
              <div className="flex-1 min-h-0 overflow-y-auto">
                {activeSection === "apiKeys" && (
                  <ApiKeysTab
                    ref={apiKeysTabRef}
                    initialApiKeys={initialApiKeys}
                    isProviderReady={isProviderReady}
                  />
                )}
                {activeSection === "text" && (
                  <TextTab
                    ref={textTabRef}
                    initialChat={initialChatSettings}
                    initialTranslation={initialTranslationSettings}
                    initialHitmeup={initialHitmeupSettings}
                    initialAibot={initialAibotSettings}
                    isProviderReady={isProviderReady}
                    hideScenarios={hideTextScenarios}
                    hideThinking={hideThinking}
                  />
                )}
                {activeSection === "image" && (
                  <ImageTab
                    ref={imageTabRef}
                    initialEnabled={initialImageEnabled}
                    initialProvider={initialImageProvider}
                    initialModel={initialImageModel}
                    initialAspectRatio={initialAspectRatio}
                    initialResolution={initialResolution}
                    isProviderReady={isProviderReady}
                  />
                )}
                {activeSection === "voice" && (
                  <VoiceTab
                    ref={voiceTabRef}
                    initialEnabled={initialVoiceEnabled}
                    initialProvider={initialVoiceProvider}
                    initialModel={initialVoiceModel}
                    initialVoiceName={initialVoiceName}
                    initialVoiceLanguage={initialVoiceLanguage}
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
                    const iconOnly = ["apiKeys", "text", "image", "voice"].includes(item.id);
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
                <TabsContent value="text" className="mt-0">
                  <TextTab
                    ref={textTabRef}
                    initialChat={initialChatSettings}
                    initialTranslation={initialTranslationSettings}
                    initialHitmeup={initialHitmeupSettings}
                    initialAibot={initialAibotSettings}
                    isProviderReady={isProviderReady}
                    hideScenarios={hideTextScenarios}
                    hideThinking={hideThinking}
                  />
                </TabsContent>
                <TabsContent value="image" className="mt-0">
                  <ImageTab
                    ref={imageTabRef}
                    initialEnabled={initialImageEnabled}
                    initialProvider={initialImageProvider}
                    initialModel={initialImageModel}
                    initialAspectRatio={initialAspectRatio}
                    initialResolution={initialResolution}
                    isProviderReady={isProviderReady}
                  />
                </TabsContent>
                <TabsContent value="voice" className="mt-0">
                  <VoiceTab
                    ref={voiceTabRef}
                    initialEnabled={initialVoiceEnabled}
                    initialProvider={initialVoiceProvider}
                    initialModel={initialVoiceModel}
                    initialVoiceName={initialVoiceName}
                    initialVoiceLanguage={initialVoiceLanguage}
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
