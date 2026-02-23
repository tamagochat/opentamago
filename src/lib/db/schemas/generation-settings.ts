import type { RxJsonSchema } from "rxdb";
import type { SafetySettings } from "~/lib/ai";

/**
 * Modality types for generation
 */
export type GenerationModality = "text" | "image" | "voice";

/**
 * Text generation scenarios
 */
export type TextScenario = "chat" | "translation" | "hitmeup" | "aibot";

/**
 * Generation-specific metadata (e.g., Gemini safety settings)
 */
export interface GenerationMetadata {
  /** Gemini-specific: Safety settings for content generation */
  safetySettings?: SafetySettings;
  /** Target language for translation scenario */
  targetLanguage?: string;
  /** Other generation-specific settings can be added here */
  [key: string]: unknown;
}

/**
 * Generation settings document stored in RxDB.
 * Stores per-scenario settings for each modality (text, image, voice).
 *
 * Document IDs:
 * - Text: "text_chat", "text_translation", "text_hitmeup"
 * - Image: "image"
 * - Voice: "voice"
 */
export interface GenerationSettingsDocument {
  /** Unique ID: modality_scenario (e.g., "text_chat", "image", "voice") */
  id: string;
  /** Generation modality */
  modality: GenerationModality;
  /** Text scenario (only for text modality) */
  scenario?: TextScenario;
  /** Whether this generation scenario is enabled (defaults to true) */
  enabled?: boolean;
  /** Provider ID to use for this scenario */
  providerId: string;
  /** Model ID to use */
  model: string;
  /** Generation temperature (0-2, mainly for text) */
  temperature?: number;
  /** Max output tokens (mainly for text) */
  maxTokens?: number;
  /** Enable thinking/reasoning mode (for models that support it) */
  thinking?: boolean;
  /** @deprecated Use aspectRatio instead */
  imageWidth?: number;
  /** @deprecated Use aspectRatio instead */
  imageHeight?: number;
  /** Image aspect ratio (e.g., "1:1", "16:9", "9:16") */
  aspectRatio?: string;
  /** Image resolution quality (e.g., "1K", "2K", "4K") */
  resolution?: string;
  /** TTS voice name (e.g., "Kore", "Puck" for Gemini) */
  voiceName?: string;
  /** TTS language code (e.g., "en-US", "ja-JP") */
  voiceLanguage?: string;
  /** Generation-specific metadata (e.g., safety settings for Gemini) */
  metadata?: GenerationMetadata;
  /** Last update timestamp */
  updatedAt: number;
}

export const generationSettingsSchema: RxJsonSchema<GenerationSettingsDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 50,
    },
    modality: {
      type: "string",
      maxLength: 20,
    },
    scenario: {
      type: "string",
      maxLength: 20,
    },
    enabled: {
      type: "boolean",
    },
    providerId: {
      type: "string",
      maxLength: 50,
    },
    model: {
      type: "string",
      maxLength: 100,
    },
    temperature: {
      type: "number",
      minimum: 0,
      maximum: 2,
    },
    maxTokens: {
      type: "integer",
      minimum: 1,
      maximum: 65536,
    },
    thinking: {
      type: "boolean",
    },
    imageWidth: {
      type: "integer",
      minimum: 64,
      maximum: 4096,
    },
    imageHeight: {
      type: "integer",
      minimum: 64,
      maximum: 4096,
    },
    aspectRatio: {
      type: "string",
      maxLength: 10,
    },
    resolution: {
      type: "string",
      maxLength: 10,
    },
    voiceName: {
      type: "string",
      maxLength: 50,
    },
    voiceLanguage: {
      type: "string",
      maxLength: 10,
    },
    metadata: {
      type: "object",
      // Flexible object for generation-specific settings (e.g., Gemini safety settings)
    },
    updatedAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999,
    },
  },
  required: ["id", "modality", "providerId", "model", "updatedAt"],
  // No indexes needed - we query by primary key (id) only
};

/**
 * Valid generation settings IDs
 */
export const GENERATION_SETTINGS_IDS = [
  "text_chat",
  "text_translation",
  "text_hitmeup",
  "text_aibot",
  "image",
  "voice",
] as const;

export type GenerationSettingsId = (typeof GENERATION_SETTINGS_IDS)[number];
