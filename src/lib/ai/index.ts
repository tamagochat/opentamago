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
  useChat,
  useGenerateCharacter,
  type ChatMessage,
  type UseChatOptions,
  type StreamingState,
  type GeneratedCharacter,
  type UseGenerateCharacterOptions,
  type GenerateCharacterState,
} from "./hooks";

// Client-side API functions (for direct Gemini calls in client mode)
export {
  streamChatResponse,
  generateChatResponse,
  generateCharacterFromImage,
  type ChatOptions,
  type GenerateCharacterOptions,
} from "./client";
