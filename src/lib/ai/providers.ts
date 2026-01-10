/**
 * Multi-modality provider configurations
 * Supports text generation, image generation, and text-to-speech
 */

// ============================================================================
// Provider Types
// ============================================================================

/** All available providers (for API key management) */
export const ALL_PROVIDERS = [
  "gemini",
  "openrouter",
  "anthropic",
  "grok",
  "openai",
  "nanogpt",
  "falai",
  "elevenlabs",
] as const;

export type Provider = (typeof ALL_PROVIDERS)[number];

/** Text generation providers */
export const TEXT_PROVIDERS = [
  "gemini",
  "openrouter",
  "anthropic",
  "grok",
  "openai",
  "nanogpt",
] as const;

export type TextProvider = (typeof TEXT_PROVIDERS)[number];

/** Image generation providers */
export const IMAGE_PROVIDERS = ["falai", "gemini"] as const;

export type ImageProvider = (typeof IMAGE_PROVIDERS)[number];

/** Voice/TTS providers */
export const VOICE_PROVIDERS = ["elevenlabs", "gemini"] as const;

export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

/** Text generation scenarios */
export const TEXT_SCENARIOS = ["chat", "translation", "hitmeup"] as const;

export type TextScenario = (typeof TEXT_SCENARIOS)[number];

/** Modality types */
export type Modality = "text" | "image" | "voice";

// ============================================================================
// Image Generation Settings (Shared across providers)
// ============================================================================

/** Supported aspect ratios for image generation */
export const ASPECT_RATIOS = [
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "21:9",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
] as const;

export type AspectRatio = (typeof ASPECT_RATIOS)[number];

/** Supported resolutions for image generation */
export const RESOLUTIONS = ["1K", "2K", "4K"] as const;

export type Resolution = (typeof RESOLUTIONS)[number];

/** SDK package types */
export type SDKPackage =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "falai"
  | "elevenlabs";

// ============================================================================
// Model Types
// ============================================================================

export interface ProviderModel {
  id: string;
  name: string;
}

// ============================================================================
// Provider Configurations (for API key management)
// ============================================================================

export interface ProviderConfig {
  id: Provider;
  name: string;
  sdkPackage: SDKPackage;
  baseUrl?: string;
  requiresApiKey: boolean;
  apiKeyPlaceholder: string;
  apiKeyUrl: string;
  /** Which modalities this provider supports */
  modalities: Modality[];
  /** Whether this provider supports reasoning/thinking mode */
  supportsReasoning?: boolean;
  /** List of model IDs that support reasoning (if not all models support it) */
  reasoningModels?: string[];
}

export const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    sdkPackage: "google",
    requiresApiKey: true,
    apiKeyPlaceholder: "AIza...",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    modalities: ["text", "image", "voice"],
    supportsReasoning: true,
    // Gemini 2.5+ and 3+ models support thinking mode
    reasoningModels: ["gemini-3-flash-preview", "gemini-3-pro-preview"],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    sdkPackage: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-or-...",
    apiKeyUrl: "https://openrouter.ai/keys",
    modalities: ["text"],
    supportsReasoning: true,
    // OpenRouter supports many reasoning models (Claude, DeepSeek, etc.) - model-dependent
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    sdkPackage: "anthropic",
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    modalities: ["text"],
    supportsReasoning: true,
  },
  grok: {
    id: "grok",
    name: "Grok (xAI)",
    sdkPackage: "xai",
    requiresApiKey: true,
    apiKeyPlaceholder: "xai-...",
    apiKeyUrl: "https://console.x.ai/",
    modalities: ["text"],
    supportsReasoning: true,
    reasoningModels: ["grok-4-fast-reasoning", "grok-4"],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    sdkPackage: "openai",
    requiresApiKey: true,
    apiKeyPlaceholder: "sk-...",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    modalities: ["text"],
    supportsReasoning: true,
    // All OpenAI models support reasoning with reasoningSummary: 'auto'
  },
  nanogpt: {
    id: "nanogpt",
    name: "NanoGPT",
    sdkPackage: "openai",
    baseUrl: "https://nano-gpt.com/api/v1",
    requiresApiKey: true,
    apiKeyPlaceholder: "nano-...",
    apiKeyUrl: "https://nano-gpt.com/api",
    modalities: ["text"],
  },
  falai: {
    id: "falai",
    name: "Fal.ai",
    sdkPackage: "falai",
    requiresApiKey: true,
    apiKeyPlaceholder: "fal-...",
    apiKeyUrl: "https://fal.ai/dashboard/keys",
    modalities: ["image"],
  },
  elevenlabs: {
    id: "elevenlabs",
    name: "ElevenLabs",
    sdkPackage: "elevenlabs",
    requiresApiKey: true,
    apiKeyPlaceholder: "sk_...",
    apiKeyUrl: "https://elevenlabs.io/app/settings/api-keys",
    modalities: ["voice"],
  },
};

// ============================================================================
// Text Generation Models
// ============================================================================

export interface TextModelConfig {
  defaultModel: string;
  models: ProviderModel[];
}

export const TEXT_MODEL_CONFIGS: Record<TextProvider, TextModelConfig> = {
  gemini: {
    defaultModel: "gemini-3-flash-preview",
    models: [
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
      { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview" },
    ],
  },
  openrouter: {
    defaultModel: "deepseek/deepseek-v3.2",
    models: [
      { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
      { id: "tngtech/deepseek-r1t2-chimera", name: "DeepSeek R1T2 Chimera" },
      { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3 0324" },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
      { id: "xiaomi/mimo-v2-flash", name: "Mimo V2 Flash" },
      { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
      { id: "nex-agi/deepseek-v3.1-nex-n1", name: "DeepSeek V3.1 Nex N1" },
      { id: "deepseek/deepseek-chat-v3.1", name: "DeepSeek V3.1" },
      { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    ],
  },
  anthropic: {
    // AI SDK 6.x: Anthropic models with reasoning support
    // claude-opus-4-5 and claude-sonnet-4-5 support extended thinking
    // Use effort option to control thinking depth on Opus models
    defaultModel: "claude-sonnet-4-5-20250514",
    models: [
      { id: "claude-opus-4-5-20250514", name: "Claude Opus 4.5" },
      { id: "claude-sonnet-4-5-20250514", name: "Claude Sonnet 4.5" },
      { id: "claude-haiku-4-5-20250514", name: "Claude Haiku 4.5" },
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet" },
    ],
  },
  grok: {
    defaultModel: "grok-4-fast-non-reasoning",
    models: [
      { id: "grok-4-fast-non-reasoning", name: "Grok 4 Fast" },
      { id: "grok-4-fast-reasoning", name: "Grok 4 Fast Reasoning" },
      { id: "grok-4", name: "Grok 4" },
    ],
  },
  openai: {
    defaultModel: "gpt-5.2",
    models: [
      { id: "gpt-5.2-pro", name: "GPT-5.2 Pro" },
      { id: "gpt-5.2-chat-latest", name: "GPT-5.2 Chat Latest" },
      { id: "gpt-5.2", name: "GPT-5.2" },
      { id: "gpt-5-mini", name: "GPT-5 Mini" },
      { id: "gpt-5-nano", name: "GPT-5 Nano" },
    ],
  },
  nanogpt: {
    defaultModel: "chatgpt-4o-latest",
    models: [
      { id: "chatgpt-4o-latest", name: "ChatGPT-4o Latest" },
      { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
      { id: "grok-2-1212", name: "Grok 2" },
      { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash" },
      { id: "deepseek-chat", name: "DeepSeek Chat" },
    ],
  },
};

// ============================================================================
// Image Generation Models
// ============================================================================

export interface ImageModelConfig {
  defaultModel: string;
  models: ProviderModel[];
}

export const IMAGE_MODEL_CONFIGS: Record<ImageProvider, ImageModelConfig> = {
  falai: {
    defaultModel: "fal-ai/z-image/turbo",
    models: [
      { id: "fal-ai/z-image/turbo", name: "Z-Image Turbo" },
      { id: "fal-ai/nano-banana", name: "Nano Banana" },
      { id: "fal-ai/nano-banana-pro", name: "Nano Banana Pro" },
    ],
  },
  gemini: {
    defaultModel: "gemini-2.5-flash-image",
    models: [
      { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image" },
      { id: "gemini-3-pro-image-preview", name: "Gemini 3 Pro Image" },
    ],
  },
};

// ============================================================================
// Voice/TTS Models
// ============================================================================

export interface VoiceModelConfig {
  defaultModel: string;
  models: ProviderModel[];
}

export const VOICE_MODEL_CONFIGS: Record<VoiceProvider, VoiceModelConfig> = {
  elevenlabs: {
    defaultModel: "eleven_multilingual_v2",
    models: [{ id: "eleven_multilingual_v2", name: "Multilingual v2" }],
  },
  gemini: {
    defaultModel: "gemini-2.5-flash-preview-tts",
    models: [
      { id: "gemini-2.5-flash-preview-tts", name: "Gemini 2.5 Flash TTS" },
      { id: "gemini-2.5-pro-preview-tts", name: "Gemini 2.5 Pro TTS" },
    ],
  },
};

// ============================================================================
// Gemini TTS Voice Options
// ============================================================================

export interface GeminiVoice {
  id: string;
  name: string;
  description: string;
}

/** Gemini TTS prebuilt voice options */
export const GEMINI_TTS_VOICES: GeminiVoice[] = [
  { id: "Zephyr", name: "Zephyr", description: "Bright" },
  { id: "Puck", name: "Puck", description: "Upbeat" },
  { id: "Charon", name: "Charon", description: "Informative" },
  { id: "Kore", name: "Kore", description: "Firm" },
  { id: "Fenrir", name: "Fenrir", description: "Excitable" },
  { id: "Leda", name: "Leda", description: "Youthful" },
  { id: "Orus", name: "Orus", description: "Firm" },
  { id: "Aoede", name: "Aoede", description: "Breezy" },
  { id: "Callirrhoe", name: "Callirrhoe", description: "Easy-going" },
  { id: "Autonoe", name: "Autonoe", description: "Bright" },
  { id: "Enceladus", name: "Enceladus", description: "Breathy" },
  { id: "Iapetus", name: "Iapetus", description: "Clear" },
  { id: "Umbriel", name: "Umbriel", description: "Easy-going" },
  { id: "Algieba", name: "Algieba", description: "Smooth" },
  { id: "Despina", name: "Despina", description: "Smooth" },
  { id: "Erinome", name: "Erinome", description: "Clear" },
  { id: "Algenib", name: "Algenib", description: "Gravelly" },
  { id: "Rasalgethi", name: "Rasalgethi", description: "Informative" },
  { id: "Laomedeia", name: "Laomedeia", description: "Upbeat" },
  { id: "Achernar", name: "Achernar", description: "Soft" },
  { id: "Alnilam", name: "Alnilam", description: "Firm" },
  { id: "Schedar", name: "Schedar", description: "Even" },
  { id: "Gacrux", name: "Gacrux", description: "Mature" },
  { id: "Pulcherrima", name: "Pulcherrima", description: "Forward" },
  { id: "Achird", name: "Achird", description: "Friendly" },
  { id: "Zubenelgenubi", name: "Zubenelgenubi", description: "Casual" },
  { id: "Vindemiatrix", name: "Vindemiatrix", description: "Gentle" },
  { id: "Sadachbia", name: "Sadachbia", description: "Lively" },
  { id: "Sadaltager", name: "Sadaltager", description: "Knowledgeable" },
  { id: "Sulafat", name: "Sulafat", description: "Warm" },
];

export const DEFAULT_GEMINI_VOICE = "Kore";

// ============================================================================
// Gemini TTS Language Options
// ============================================================================

export interface TtsLanguage {
  code: string;
  name: string;
}

/** Gemini TTS supported languages */
export const GEMINI_TTS_LANGUAGES: TtsLanguage[] = [
  { code: "en-US", name: "English (US)" },
  { code: "en-IN", name: "English (India)" },
  { code: "ar-EG", name: "Arabic (Egyptian)" },
  { code: "bn-BD", name: "Bengali (Bangladesh)" },
  { code: "de-DE", name: "German (Germany)" },
  { code: "es-US", name: "Spanish (US)" },
  { code: "fr-FR", name: "French (France)" },
  { code: "hi-IN", name: "Hindi (India)" },
  { code: "id-ID", name: "Indonesian (Indonesia)" },
  { code: "it-IT", name: "Italian (Italy)" },
  { code: "ja-JP", name: "Japanese (Japan)" },
  { code: "ko-KR", name: "Korean (Korea)" },
  { code: "mr-IN", name: "Marathi (India)" },
  { code: "nl-NL", name: "Dutch (Netherlands)" },
  { code: "pl-PL", name: "Polish (Poland)" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ro-RO", name: "Romanian (Romania)" },
  { code: "ru-RU", name: "Russian (Russia)" },
  { code: "ta-IN", name: "Tamil (India)" },
  { code: "te-IN", name: "Telugu (India)" },
  { code: "th-TH", name: "Thai (Thailand)" },
  { code: "tr-TR", name: "Turkish (Turkey)" },
  { code: "uk-UA", name: "Ukrainian (Ukraine)" },
  { code: "vi-VN", name: "Vietnamese (Vietnam)" },
];

export const DEFAULT_TTS_LANGUAGE = "en-US";

// ============================================================================
// Default Providers per Modality
// ============================================================================

export const DEFAULT_TEXT_PROVIDER: TextProvider = "gemini";
export const DEFAULT_IMAGE_PROVIDER: ImageProvider = "falai";
export const DEFAULT_VOICE_PROVIDER: VoiceProvider = "elevenlabs";

// ============================================================================
// Helper Functions
// ============================================================================

export function getProviderConfig(provider: Provider): ProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

export function getTextModels(provider: TextProvider): ProviderModel[] {
  return TEXT_MODEL_CONFIGS[provider].models;
}

export function getImageModels(provider: ImageProvider): ProviderModel[] {
  return IMAGE_MODEL_CONFIGS[provider].models;
}

export function getVoiceModels(provider: VoiceProvider): ProviderModel[] {
  return VOICE_MODEL_CONFIGS[provider].models;
}

export function isTextProvider(provider: string): provider is TextProvider {
  return TEXT_PROVIDERS.includes(provider as TextProvider);
}

export function isImageProvider(provider: string): provider is ImageProvider {
  return IMAGE_PROVIDERS.includes(provider as ImageProvider);
}

export function isVoiceProvider(provider: string): provider is VoiceProvider {
  return VOICE_PROVIDERS.includes(provider as VoiceProvider);
}

export function isValidProvider(provider: string): provider is Provider {
  return ALL_PROVIDERS.includes(provider as Provider);
}

export function getProvidersForModality(modality: Modality): Provider[] {
  return ALL_PROVIDERS.filter((p) =>
    PROVIDER_CONFIGS[p].modalities.includes(modality)
  );
}

/**
 * Check if a provider/model combination supports reasoning/thinking mode
 */
export function modelSupportsReasoning(
  providerId: Provider,
  modelId: string
): boolean {
  const config = PROVIDER_CONFIGS[providerId];
  if (!config.supportsReasoning) return false;
  // If no reasoningModels specified, all models support it (e.g., openrouter)
  if (!config.reasoningModels) return true;
  // Check if the model is in the list of reasoning-capable models
  console.log("reasoningModels", config.reasoningModels, modelId);
  return config.reasoningModels.some(
    (m) => modelId.includes(m) || m.includes(modelId)
  );
}

// ============================================================================
// Legacy exports for backward compatibility
// ============================================================================

/** @deprecated Use TEXT_PROVIDERS instead */
export const LLM_PROVIDERS = TEXT_PROVIDERS;

/** @deprecated Use TextProvider instead */
export type LLMProvider = TextProvider;
