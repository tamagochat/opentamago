"use client";

import { useEffect, useState, useCallback } from "react";
import { useDatabase } from "./useDatabase";
import type { GenerationSettingsDocument, GenerationSettingsId } from "../schemas";
import { GENERATION_SETTINGS_IDS } from "../schemas";
import {
  DEFAULT_TEXT_PROVIDER,
  DEFAULT_IMAGE_PROVIDER,
  DEFAULT_VOICE_PROVIDER,
  TEXT_MODEL_CONFIGS,
  IMAGE_MODEL_CONFIGS,
  VOICE_MODEL_CONFIGS,
  DEFAULT_GEMINI_VOICE,
  DEFAULT_TTS_LANGUAGE,
  type TextProvider,
  type ImageProvider,
  type VoiceProvider,
} from "~/lib/ai/providers";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Default generation settings for each scenario
 */
function getDefaultSettings(id: GenerationSettingsId): GenerationSettingsDocument {
  const now = Date.now();

  switch (id) {
    case "text_chat":
      return {
        id: "text_chat",
        modality: "text",
        scenario: "chat",
        enabled: true,
        providerId: DEFAULT_TEXT_PROVIDER,
        model: TEXT_MODEL_CONFIGS[DEFAULT_TEXT_PROVIDER].defaultModel,
        temperature: 0.9,
        maxTokens: 4096,
        thinking: false,
        updatedAt: now,
      };
    case "text_translation":
      return {
        id: "text_translation",
        modality: "text",
        scenario: "translation",
        enabled: true,
        providerId: DEFAULT_TEXT_PROVIDER,
        model: TEXT_MODEL_CONFIGS[DEFAULT_TEXT_PROVIDER].defaultModel,
        temperature: 0.3,
        maxTokens: 2048,
        thinking: false,
        updatedAt: now,
      };
    case "text_hitmeup":
      return {
        id: "text_hitmeup",
        modality: "text",
        scenario: "hitmeup",
        enabled: true,
        providerId: DEFAULT_TEXT_PROVIDER,
        model: TEXT_MODEL_CONFIGS[DEFAULT_TEXT_PROVIDER].defaultModel,
        temperature: 1.0,
        maxTokens: 512,
        thinking: false,
        updatedAt: now,
      };
    case "text_aibot":
      return {
        id: "text_aibot",
        modality: "text",
        scenario: "aibot",
        enabled: true,
        providerId: DEFAULT_TEXT_PROVIDER,
        model: TEXT_MODEL_CONFIGS[DEFAULT_TEXT_PROVIDER].defaultModel,
        temperature: 0.1,
        maxTokens: 2048,
        thinking: false,
        updatedAt: now,
      };
    case "image":
      return {
        id: "image",
        modality: "image",
        enabled: true,
        providerId: DEFAULT_IMAGE_PROVIDER,
        model: IMAGE_MODEL_CONFIGS[DEFAULT_IMAGE_PROVIDER].defaultModel,
        updatedAt: now,
      };
    case "voice":
      return {
        id: "voice",
        modality: "voice",
        enabled: true,
        providerId: DEFAULT_VOICE_PROVIDER,
        model: VOICE_MODEL_CONFIGS[DEFAULT_VOICE_PROVIDER].defaultModel,
        voiceName: DEFAULT_GEMINI_VOICE,
        voiceLanguage: DEFAULT_TTS_LANGUAGE,
        updatedAt: now,
      };
  }
}

/**
 * Hook for managing generation settings (model, temperature, etc.) per scenario.
 * Each modality+scenario combination has its own document.
 */
export function useGenerationSettings() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [settings, setSettings] = useState<Map<GenerationSettingsId, GenerationSettingsDocument>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);

  // Initialize default generation settings if they don't exist
  useEffect(() => {
    if (!db) return;

    const initSettings = async () => {
      for (const id of GENERATION_SETTINGS_IDS) {
        try {
          const existing = await db.generationSettings.findOne(id).exec();
          if (!existing) {
            const defaultSettings = getDefaultSettings(id);
            await db.generationSettings.insert(defaultSettings);
          }
        } catch (error: unknown) {
          // Handle conflicts gracefully (document created by another instance)
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "CONFLICT"
          ) {
            console.warn(`Generation settings insert conflict for ${id}, skipping`);
          } else {
            console.error(`Error initializing generation settings for ${id}:`, error);
          }
        }
      }
      setIsLoading(false);
    };

    void initSettings();

    // Subscribe to all generation settings
    const subscription = db.generationSettings.find().$.subscribe((docs) => {
      const map = new Map<GenerationSettingsId, GenerationSettingsDocument>();
      docs.forEach((doc) => {
        const data = toMutable<GenerationSettingsDocument>(doc.toJSON());
        if (GENERATION_SETTINGS_IDS.includes(data.id as GenerationSettingsId)) {
          map.set(data.id as GenerationSettingsId, data);
        }
      });
      setSettings(map);
    });

    return () => subscription.unsubscribe();
  }, [db]);

  /**
   * Get settings for a specific scenario
   */
  const getSettings = useCallback(
    (id: GenerationSettingsId): GenerationSettingsDocument | undefined => {
      return settings.get(id);
    },
    [settings]
  );

  /**
   * Get settings for text chat (convenience helper)
   */
  const getChatSettings = useCallback((): GenerationSettingsDocument | undefined => {
    return settings.get("text_chat");
  }, [settings]);

  /**
   * Get settings for image generation (convenience helper)
   */
  const getImageSettings = useCallback((): GenerationSettingsDocument | undefined => {
    return settings.get("image");
  }, [settings]);

  /**
   * Get settings for voice/TTS (convenience helper)
   */
  const getVoiceSettings = useCallback((): GenerationSettingsDocument | undefined => {
    return settings.get("voice");
  }, [settings]);

  /**
   * Update settings for a specific scenario
   */
  const updateSettings = useCallback(
    async (
      id: GenerationSettingsId,
      data: Partial<Omit<GenerationSettingsDocument, "id" | "modality" | "scenario">>
    ) => {
      if (!db) return null;

      const doc = await db.generationSettings.findOne(id).exec();
      if (!doc) {
        // Create with defaults if doesn't exist
        const defaultSettings = getDefaultSettings(id);
        await db.generationSettings.insert({
          ...defaultSettings,
          ...data,
          updatedAt: Date.now(),
        });
        return db.generationSettings.findOne(id).exec().then((d) =>
          d ? toMutable<GenerationSettingsDocument>(d.toJSON()) : null
        );
      }

      await doc.patch({
        ...data,
        updatedAt: Date.now(),
      });

      return toMutable<GenerationSettingsDocument>(doc.toJSON());
    },
    [db]
  );

  /**
   * Set provider and model for a scenario
   */
  const setProviderAndModel = useCallback(
    async (id: GenerationSettingsId, providerId: string, model: string) => {
      return updateSettings(id, { providerId, model });
    },
    [updateSettings]
  );

  /**
   * Set text generation parameters
   */
  const setTextParams = useCallback(
    async (
      id: "text_chat" | "text_translation" | "text_hitmeup",
      params: { temperature?: number; maxTokens?: number; thinking?: boolean }
    ) => {
      return updateSettings(id, params);
    },
    [updateSettings]
  );

  return {
    settings,
    isLoading: dbLoading || isLoading,
    getSettings,
    getChatSettings,
    getImageSettings,
    getVoiceSettings,
    updateSettings,
    setProviderAndModel,
    setTextParams,
  };
}
