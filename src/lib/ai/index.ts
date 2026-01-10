export const SUPPORTED_MODELS = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)", provider: "google" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)", provider: "google" },
] as const;

export type SupportedModel = (typeof SUPPORTED_MODELS)[number]["id"];

export const DEFAULT_MODEL = "gemini-3-flash-preview";

export const HARM_CATEGORIES = [
  "HARM_CATEGORY_HATE_SPEECH",
  "HARM_CATEGORY_HARASSMENT",
  "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  "HARM_CATEGORY_DANGEROUS_CONTENT",
] as const;

export type HarmCategory = (typeof HARM_CATEGORIES)[number];

export const BLOCK_THRESHOLDS = [
  { id: "BLOCK_NONE", name: "Block None" },
  { id: "BLOCK_LOW_AND_ABOVE", name: "Block Low+" },
  { id: "BLOCK_MEDIUM_AND_ABOVE", name: "Block Medium+" },
  { id: "BLOCK_ONLY_HIGH", name: "Block High Only" },
] as const;

export type BlockThreshold = (typeof BLOCK_THRESHOLDS)[number]["id"];

export type SafetySettings = Record<HarmCategory, BlockThreshold>;

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  HARM_CATEGORY_HATE_SPEECH: "BLOCK_NONE",
  HARM_CATEGORY_HARASSMENT: "BLOCK_NONE",
  HARM_CATEGORY_SEXUALLY_EXPLICIT: "BLOCK_NONE",
  HARM_CATEGORY_DANGEROUS_CONTENT: "BLOCK_NONE",
};

export const DEFAULT_SAFETY_SETTINGS_ARRAY = [
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
] as const;

export function toGeminiSafetySettings(settings: SafetySettings) {
  return Object.entries(settings).map(([category, threshold]) => ({
    category,
    threshold,
  }));
}

export const HARM_CATEGORY_LABELS: Record<HarmCategory, string> = {
  HARM_CATEGORY_HATE_SPEECH: "Hate Speech",
  HARM_CATEGORY_HARASSMENT: "Harassment",
  HARM_CATEGORY_SEXUALLY_EXPLICIT: "Sexually Explicit",
  HARM_CATEGORY_DANGEROUS_CONTENT: "Dangerous Content",
};

// Client-side hooks
export {
  useGenerateCharacter,
  type GeneratedCharacter,
  type UseGenerateCharacterOptions,
  type GenerateCharacterState,
} from "./hooks";

// Client-side API functions
export {
  streamChatResponse,
  generateChatResponse,
  generateMessengerResponse,
  generateCharacterFromImage,
  translateText,
  generateImage,
  generateSpeech,
  DEFAULT_ELEVENLABS_VOICE_ID,
  type AnthropicEffort,
  type ChatMessage,
  type ChatOptions,
  type ChatResponseWithReasoning,
  type MessengerOptions,
  type GenerateCharacterOptions,
  type TranslateTextOptions,
  type GenerateImageOptions,
  type GeneratedImage,
  type GenerateImageResult,
  type GenerateSpeechOptions,
  type GeneratedSpeech,
} from "./client";

// Image parameter mapping utilities
export {
  calculateDimensions,
  getImageParams,
  buildZImageTurboParams,
  buildNanoBananaParams,
  buildNanoBananaProParams,
  buildGenericImageParams,
} from "./image-params";

// Proxy AI provider (routes through server, no client API key needed)
export { createProxyAI, getProxyAI } from "./proxy";

// Provider configuration and factory
export {
  // Provider arrays
  ALL_PROVIDERS,
  TEXT_PROVIDERS,
  IMAGE_PROVIDERS,
  VOICE_PROVIDERS,
  TEXT_SCENARIOS,
  // Image generation settings
  ASPECT_RATIOS,
  RESOLUTIONS,
  // Gemini TTS settings
  GEMINI_TTS_VOICES,
  GEMINI_TTS_LANGUAGES,
  DEFAULT_GEMINI_VOICE,
  DEFAULT_TTS_LANGUAGE,
  // Provider configs
  PROVIDER_CONFIGS,
  TEXT_MODEL_CONFIGS,
  IMAGE_MODEL_CONFIGS,
  VOICE_MODEL_CONFIGS,
  // Default providers
  DEFAULT_TEXT_PROVIDER,
  DEFAULT_IMAGE_PROVIDER,
  DEFAULT_VOICE_PROVIDER,
  // Helper functions
  getProviderConfig,
  getTextModels,
  getImageModels,
  getVoiceModels,
  isTextProvider,
  isImageProvider,
  isVoiceProvider,
  isValidProvider,
  getProvidersForModality,
  modelSupportsReasoning,
  // Types
  type Provider,
  type TextProvider,
  type ImageProvider,
  type VoiceProvider,
  type TextScenario,
  type Modality,
  type ProviderConfig,
  type ProviderModel,
  type SDKPackage,
  type AspectRatio,
  type Resolution,
  type GeminiVoice,
  type TtsLanguage,
  // Legacy exports
  LLM_PROVIDERS,
  type LLMProvider,
} from "./providers";

export {
  createAIProvider,
  getModelFromProvider,
  type AIProviderInstance,
  type ProviderOptions,
} from "./provider-factory";
