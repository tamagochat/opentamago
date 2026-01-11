"use client";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GoogleGenAI } from "@google/genai";
import { fal } from "@fal-ai/client";
import { streamText, generateText, generateObject } from "ai";
import { z } from "zod";
import {
  DEFAULT_SAFETY_SETTINGS_ARRAY,
  toGeminiSafetySettings,
  type SafetySettings,
} from "./index";
import { createProxyAI } from "./proxy";
import { createAIProvider } from "./provider-factory";
import {
  TEXT_MODEL_CONFIGS,
  VOICE_MODEL_CONFIGS,
  IMAGE_MODEL_CONFIGS,
  DEFAULT_GEMINI_VOICE,
  DEFAULT_TTS_LANGUAGE,
  modelSupportsReasoning,
  type TextProvider,
  type LLMProvider,
  type ImageProvider,
  type VoiceProvider,
  type AspectRatio,
  type Resolution,
} from "./providers";
import { getImageParams, calculateDimensions } from "./image-params";
import type { ProviderSettingsDocument } from "~/lib/db/schemas";
import type { ChatBubbleResponse } from "~/lib/chat/types";

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/** Effort levels for extended thinking (Anthropic, Grok) */
export type ReasoningEffort = "high" | "medium" | "low";

/** @deprecated Use ReasoningEffort instead */
export type AnthropicEffort = ReasoningEffort;

/**
 * Options for chat operations
 */
export interface ChatOptions {
  messages: ChatMessage[];
  providerId: LLMProvider;
  providerSettings: ProviderSettingsDocument;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Enable reasoning/thinking mode if model supports it */
  thinking?: boolean;
  /** Budget for thinking tokens (Anthropic only, default 10000) */
  thinkingBudget?: number;
  /** Effort level for reasoning (Anthropic: default "high", Grok: default "low") */
  effort?: ReasoningEffort;
}

/**
 * Response from chat operations with optional reasoning
 */
export interface ChatResponseWithReasoning {
  content: string;
  /** Merged reasoning/thinking content from LLM */
  reasoning?: string;
}

export interface GenerateCharacterOptions {
  image: File;
  context?: string;
  providerId: LLMProvider;
  providerSettings: ProviderSettingsDocument;
}

export interface GeneratedCharacter {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleDialogue: string;
  systemPrompt: string;
  tags: string[];
}

export interface MessengerOptions extends Omit<ChatOptions, "signal"> {
  systemPrompt: string;
  /** Effort level for reasoning (inherited from ChatOptions) */
  effort?: ReasoningEffort;
}

export interface TranslateTextOptions {
  text: string;
  targetLanguage: string;
  providerId: LLMProvider;
  providerSettings: ProviderSettingsDocument;
  model?: string;
}

// ============================================================================
// Schemas
// ============================================================================

const characterSchema = z.object({
  name: z
    .string()
    .describe("A fitting name for the character based on their appearance"),
  description: z
    .string()
    .describe("Physical appearance and notable features (2-3 sentences)"),
  personality: z
    .string()
    .describe(
      "Core personality traits, speaking style, mannerisms (2-3 sentences)"
    ),
  scenario: z
    .string()
    .describe("Default setting or context for this character (1-2 sentences)"),
  firstMessage: z
    .string()
    .describe(
      "An in-character greeting message that this character would say when meeting someone new"
    ),
  exampleDialogue: z
    .string()
    .describe(
      "2-3 example dialogue exchanges showing the character's voice and style"
    ),
  systemPrompt: z
    .string()
    .describe(
      "Instructions for an AI to roleplay this character accurately, including speech patterns and behaviors"
    ),
  tags: z
    .array(z.string())
    .describe(
      "3-5 categorization tags like 'fantasy', 'warrior', 'kind', etc."
    ),
});

const messengerBubbleSchema = z.object({
  messages: z
    .array(
      z.object({
        delay: z
          .number()
          .min(500)
          .max(30000)
          .describe(
            "Delay in milliseconds before sending this message (500-30000ms)"
          ),
        content: z.string().min(1).describe("The message content to send"),
      })
    )
    .min(1)
    .max(5)
    .describe("Array of 1-5 messages to send in sequence"),
  memory: z
    .string()
    .optional()
    .describe("Optional memory summary for significant events only"),
});

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Build provider-specific options for reasoning/thinking mode
 *
 * For Anthropic (AI SDK 6.x):
 * - thinking: { type: 'enabled', budgetTokens: number } enables extended thinking
 * - effort: 'high' | 'medium' | 'low' controls thinking depth (Claude Opus 4.5)
 *
 * For Grok (xAI):
 * - reasoningEffort: 'low' | 'medium' | 'high' controls reasoning depth
 *
 * @see https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic#reasoning
 * @see https://sdk.vercel.ai/providers/ai-sdk-providers/xai-grok
 */
function buildReasoningOptions(
  providerId: LLMProvider,
  thinking: boolean,
  thinkingBudget: number,
  modelId?: string,
  effort?: ReasoningEffort
): Record<string, unknown> | undefined {
  if (!thinking) return undefined;

  switch (providerId) {
    case "anthropic": {
      // AI SDK 6.x Anthropic provider options
      const anthropicOptions: Record<string, unknown> = {
        thinking: { type: "enabled", budgetTokens: thinkingBudget },
      };

      // Effort option is only supported for Claude Opus 4.5 models
      // Affects thinking, text responses, and function calls
      // Defaults to 'high', can set to 'medium' or 'low' to save tokens
      if (effort && modelId?.includes("opus")) {
        anthropicOptions.effort = effort;
      }

      return { anthropic: anthropicOptions };
    }
    case "grok":
      // xAI Grok models support reasoningEffort for reasoning models
      // Defaults to 'low' for efficient reasoning
      return {
        xai: {
          reasoningEffort: effort ?? "low",
        },
      };
    case "gemini":
      // Gemini 3 models use thinkingLevel, 2.5 uses thinkingConfig
      if (modelId?.includes("gemini-3")) {
        return {
          google: {
            thinkingConfig: {
              thinkingLevel: "low",
              includeThoughts: true,
            },
          },
        };
      }
      // Gemini 2.5 and 2.0 thinking models use thinkingConfig with budget
      return {
        google: {
          thinkingConfig: {
            thinkingBudget: thinkingBudget,
            includeThoughts: true,
          },
        },
      };
    case "openai":
      // OpenAI GPT-5+ models support reasoning with reasoningSummary
      // 'auto' provides condensed summaries, 'detailed' provides comprehensive reasoning
      return {
        openai: {
          reasoningSummary: "auto",
        },
      };
    case "openrouter":
      // OpenRouter supports reasoning with effort (OpenAI-style) or max_tokens (Anthropic-style)
      // effort: "xhigh" | "high" | "medium" | "low" | "minimal" | "none"
      return {
        openrouter: {
          reasoning: {
            effort: effort ?? "medium",
            exclude: false, // Include reasoning tokens in response
          },
        },
      };
    default:
      return undefined;
  }
}

/**
 * Normalize reasoning content to a string
 * Handles various formats that AI providers might return
 */
function normalizeReasoning(reasoning: unknown): string {
  if (typeof reasoning === "string") {
    return reasoning;
  }
  if (Array.isArray(reasoning)) {
    return reasoning
      .map((r) => {
        if (typeof r === "string") return r;
        if (r?.text) return r.text;
        if (r?.content) return r.content;
        if (r?.thinking) return r.thinking;
        return JSON.stringify(r);
      })
      .join("\n\n");
  }
  if (reasoning && typeof reasoning === "object") {
    const obj = reasoning as Record<string, unknown>;
    if (obj.text) return String(obj.text);
    if (obj.content) return String(obj.content);
    if (obj.thinking) return String(obj.thinking);
  }
  return JSON.stringify(reasoning);
}

/**
 * Extract reasoning/thinking content from AI SDK 6.x response
 *
 * AI SDK 6.x provides reasoning content in multiple ways:
 * - result.reasoningText: Merged reasoning text (most convenient)
 * - result.reasoning: Detailed reasoning array (includes redacted content info)
 * - providerMetadata.anthropic: Provider-specific metadata
 *
 * @see https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic#reasoning
 */
function extractReasoning(
  result: unknown,
  providerId: LLMProvider
): string | undefined {
  try {
    const resultObj = result as Record<string, unknown>;

    // AI SDK 6.x: Check for reasoningText property first (most convenient)
    // This is available for Anthropic, OpenAI, and other providers
    if (resultObj?.reasoningText && typeof resultObj.reasoningText === "string") {
      return resultObj.reasoningText;
    }

    // AI SDK 6.x: Check for reasoning array (contains detailed info including redacted reasoning)
    if (resultObj?.reasoning && Array.isArray(resultObj.reasoning)) {
      const reasoningParts = resultObj.reasoning
        .map((r: unknown) => {
          if (typeof r === "string") return r;
          const part = r as Record<string, unknown>;
          // Handle Anthropic thinking blocks
          if (part?.type === "thinking" && part?.thinking) {
            return String(part.thinking);
          }
          if (part?.text) return String(part.text);
          if (part?.content) return String(part.content);
          return null;
        })
        .filter(Boolean);

      if (reasoningParts.length > 0) {
        return reasoningParts.join("\n\n");
      }
    }

    // Fallback: Check provider metadata
    const metadata = (
      resultObj?.providerMetadata ?? resultObj?.experimental_providerMetadata
    ) as Record<string, unknown> | undefined;

    // Anthropic extended thinking via metadata
    if (providerId === "anthropic" && metadata?.anthropic) {
      const anthropicMeta = metadata.anthropic as Record<string, unknown>;
      const thinking = anthropicMeta?.thinking;
      if (Array.isArray(thinking)) {
        return thinking
          .filter((t: unknown) => {
            const item = t as Record<string, unknown>;
            return item?.type === "thinking" && item?.thinking;
          })
          .map((t: unknown) => String((t as Record<string, unknown>).thinking))
          .join("\n\n");
      }
    }

    // Gemini thinking
    if (providerId === "gemini") {
      if (metadata?.google) {
        const googleMeta = metadata.google as Record<string, unknown>;
        if (googleMeta?.thoughts) {
          return normalizeReasoning(googleMeta.thoughts);
        }
      }
    }

    // OpenAI reasoning via metadata
    if (providerId === "openai" && metadata?.openai) {
      const openaiMeta = metadata.openai as Record<string, unknown>;
      if (openaiMeta?.reasoning) {
        return normalizeReasoning(openaiMeta.reasoning);
      }
    }

    // xAI Grok reasoning via metadata
    if (providerId === "grok" && metadata?.xai) {
      const xaiMeta = metadata.xai as Record<string, unknown>;
      if (xaiMeta?.reasoning) {
        return normalizeReasoning(xaiMeta.reasoning);
      }
    }

    // OpenRouter reasoning via metadata or direct response
    if (providerId === "openrouter") {
      // Check metadata first
      if (metadata?.openrouter) {
        const openrouterMeta = metadata.openrouter as Record<string, unknown>;
        if (openrouterMeta?.reasoning) {
          return normalizeReasoning(openrouterMeta.reasoning);
        }
        // Check reasoning_details array
        if (openrouterMeta?.reasoning_details && Array.isArray(openrouterMeta.reasoning_details)) {
          const details = openrouterMeta.reasoning_details as Record<string, unknown>[];
          const texts = details
            .filter((d) => d?.type === "reasoning.text" && d?.text)
            .map((d) => String(d.text));
          if (texts.length > 0) {
            return texts.join("\n\n");
          }
        }
      }
      // Check direct response structure (OpenRouter returns reasoning in message)
      const response = resultObj?.response as Record<string, unknown> | undefined;
      const choices = (response?.choices ?? resultObj?.choices) as Record<string, unknown>[] | undefined;
      if (choices?.[0]) {
        const message = choices[0].message as Record<string, unknown> | undefined;
        if (message?.reasoning && typeof message.reasoning === "string") {
          return message.reasoning;
        }
        // Check reasoning_details in message
        if (message?.reasoning_details && Array.isArray(message.reasoning_details)) {
          const details = message.reasoning_details as Record<string, unknown>[];
          const texts = details
            .filter((d) => d?.type === "reasoning.text" && d?.text)
            .map((d) => String(d.text));
          if (texts.length > 0) {
            return texts.join("\n\n");
          }
        }
      }
    }

    // Generic fallback
    if (metadata?.reasoning) {
      return typeof metadata.reasoning === "string"
        ? metadata.reasoning
        : JSON.stringify(metadata.reasoning);
    }
  } catch (e) {
    console.warn("[AI/Client] Failed to extract reasoning:", e);
  }
  return undefined;
}

/**
 * Get Gemini provider for legacy operations (character generation)
 * @internal
 */
function getGeminiProvider(providerSettings: ProviderSettingsDocument) {
  if (providerSettings.apiKey) {
    return createGoogleGenerativeAI({ apiKey: providerSettings.apiKey });
  }
  return createProxyAI();
}

// ============================================================================
// Chat APIs
// ============================================================================

/**
 * Streaming chat API - yields chunks as they arrive
 * Use this for real-time chat responses
 */
export async function* streamChatResponse(
  options: ChatOptions
): AsyncGenerator<string, ChatResponseWithReasoning, unknown> {
  const {
    messages,
    providerId,
    providerSettings,
    model,
    temperature = 0.9,
    maxTokens = 4096,
    signal,
    thinking = false,
    thinkingBudget = 10000,
    effort,
  } = options;

  const textModelConfig = TEXT_MODEL_CONFIGS[providerId as TextProvider];
  const modelId =
    model ?? textModelConfig?.defaultModel ?? "gemini-3-flash-preview";

  // Only enable thinking if both requested AND the model supports it
  const effectiveThinking =
    thinking && modelSupportsReasoning(providerId, modelId);

  console.log("[AI/Client] streamChatResponse called", {
    providerId,
    modelId,
    hasApiKey: !!providerSettings.apiKey,
    thinkingRequested: thinking,
    thinkingEnabled: effectiveThinking,
    effort: providerId === "anthropic" ? effort : undefined,
  });

  const provider = createAIProvider(providerId, providerSettings);
  const providerOptions = buildReasoningOptions(
    providerId,
    effectiveThinking,
    thinkingBudget,
    modelId,
    effort
  );

  const streamOptions: Parameters<typeof streamText>[0] = {
    model: provider(modelId),
    messages,
    temperature,
    maxOutputTokens: maxTokens,
    abortSignal: signal,
  };

  if (providerOptions) {
    (streamOptions as any).providerOptions = providerOptions;
  }

  const result = streamText(streamOptions);

  const chunks: string[] = [];
  let chunkIndex = 0;
  for await (const chunk of result.textStream) {
    if (chunkIndex === 0) {
      console.log("[AI/Client] First chunk received");
    }
    chunkIndex++;
    chunks.push(chunk);
    yield chunk;
  }

  console.log(`[AI/Client] Stream complete. Total chunks: ${chunkIndex}`);

  // Extract reasoning after stream is complete
  // For streaming responses, we need to await the response object
  let reasoning: string | undefined;
  if (effectiveThinking) {
    try {
      // AI SDK 4.2+: streamText result has async properties we need to await
      const response = await result.response;
      reasoning = extractReasoning(response, providerId);

      // Also check if result has reasoning property directly (AI SDK may vary by version)
      if (!reasoning && (result as any).reasoning) {
        const directReasoning = await (result as any).reasoning;
        if (directReasoning) {
          reasoning = normalizeReasoning(directReasoning);
        }
      }

      console.log(`[AI/Client] Reasoning extracted: ${reasoning ? reasoning.substring(0, 100) + "..." : "none"}`);
    } catch (e) {
      console.error("[AI/Client] Failed to extract reasoning:", e);
    }
  }

  return {
    content: chunks.join(""),
    reasoning,
  };
}

/**
 * Non-streaming chat API - returns complete response with optional reasoning
 * Use this for auto-reply or when you need the full response at once
 */
export async function generateChatResponse(
  options: Omit<ChatOptions, "signal">
): Promise<ChatResponseWithReasoning> {
  const {
    messages,
    providerId,
    providerSettings,
    model,
    temperature = 0.9,
    maxTokens = 4096,
    thinking = false,
    thinkingBudget = 10000,
    effort,
  } = options;

  const textModelConfig = TEXT_MODEL_CONFIGS[providerId as TextProvider];
  const modelId =
    model ?? textModelConfig?.defaultModel ?? "gemini-3-flash-preview";

  // Only enable thinking if both requested AND the model supports it
  const effectiveThinking =
    thinking && modelSupportsReasoning(providerId, modelId);

  console.log("[AI/Client] generateChatResponse called", {
    providerId,
    modelId,
    thinkingRequested: thinking,
    thinkingEnabled: effectiveThinking,
    effort: providerId === "anthropic" ? effort : undefined,
  });

  const provider = createAIProvider(providerId, providerSettings);
  const providerOptions = buildReasoningOptions(
    providerId,
    effectiveThinking,
    thinkingBudget,
    modelId,
    effort
  );

  const generateOptions: Parameters<typeof generateText>[0] = {
    model: provider(modelId),
    messages,
    temperature,
    maxOutputTokens: maxTokens,
  };

  if (providerOptions) {
    (generateOptions as any).providerOptions = providerOptions;
  }

  const result = await generateText(generateOptions);

  // Extract reasoning if thinking was enabled
  let reasoning: string | undefined;
  if (effectiveThinking) {
    reasoning = extractReasoning(result, providerId);

    // Also check direct reasoning property
    if (!reasoning && (result as any).reasoning) {
      reasoning = normalizeReasoning((result as any).reasoning);
    }

    console.log(`[AI/Client] generateChatResponse reasoning: ${reasoning ? reasoning.substring(0, 100) + "..." : "none"}`);
  }

  return {
    content: result.text,
    reasoning,
  };
}

// ============================================================================
// Messenger APIs
// ============================================================================

/**
 * Generate messenger-style structured response
 * Returns JSON with messages array (each with delay and content)
 */
export async function generateMessengerResponse(
  options: MessengerOptions
): Promise<ChatBubbleResponse> {
  const {
    messages,
    systemPrompt,
    providerId,
    providerSettings,
    model,
    temperature = 0.9,
    maxTokens = 4096,
    thinking = false,
    thinkingBudget = 10000,
    effort,
  } = options;

  const textModelConfig = TEXT_MODEL_CONFIGS[providerId as TextProvider];
  const modelId =
    model ?? textModelConfig?.defaultModel ?? "gemini-3-flash-preview";

  // Only enable thinking if both requested AND the model supports it
  const effectiveThinking =
    thinking && modelSupportsReasoning(providerId, modelId);

  console.log("[AI/Client] generateMessengerResponse called", {
    providerId,
    modelId,
    thinkingRequested: thinking,
    thinkingEnabled: effectiveThinking,
    effort: providerId === "anthropic" ? effort : undefined,
  });

  const provider = createAIProvider(providerId, providerSettings);
  const providerOptions = buildReasoningOptions(
    providerId,
    effectiveThinking,
    thinkingBudget,
    modelId,
    effort
  );

  const allMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  const generateOptions: Parameters<typeof generateObject>[0] = {
    model: provider(modelId),
    schema: messengerBubbleSchema,
    messages: allMessages,
    temperature,
    maxOutputTokens: maxTokens,
  };

  if (providerOptions) {
    (generateOptions as any).providerOptions = providerOptions;
  }

  let reasoning: string | undefined;

  try {
    const result = await generateObject(generateOptions);

    // Extract reasoning if thinking was enabled
    if (effectiveThinking) {
      reasoning = extractReasoning(result, providerId);

      // Also check direct reasoning property
      if (!reasoning && (result as any).reasoning) {
        reasoning = normalizeReasoning((result as any).reasoning);
      }

      console.log(`[AI/Client] generateMessengerResponse reasoning: ${reasoning ? reasoning.substring(0, 100) + "..." : "none"}`);
    }

    return {
      ...(result.object as ChatBubbleResponse),
      reasoning,
    };
  } catch (error) {
    // If generateObject fails (e.g., model returns plain text instead of JSON),
    // fall back to generateText and reconstruct the response
    console.warn("[AI/Client] generateObject failed, falling back to generateText:", error);

    const textResult = await generateText({
      model: provider(modelId),
      messages: allMessages,
      temperature,
      maxOutputTokens: maxTokens,
    });

    const responseText = textResult.text.trim();

    // Extract reasoning if thinking was enabled
    if (effectiveThinking) {
      reasoning = extractReasoning(textResult, providerId);
    }

    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(responseText);
      if (parsed.messages && Array.isArray(parsed.messages)) {
        console.log("[AI/Client] Successfully parsed JSON from text response");
        return {
          messages: parsed.messages,
          memory: parsed.memory,
          reasoning,
        };
      }
    } catch {
      // Not valid JSON, continue to plain text reconstruction
    }

    // Reconstruct messages from plain text
    console.log("[AI/Client] Reconstructing messages from plain text response");

    // Split by newlines and filter empty lines
    const lines = responseText
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Create messages from lines (or single message if no newlines)
    const messages = lines.length > 0
      ? lines.map((content, index) => ({
          delay: index === 0 ? 1500 : 1000 + Math.random() * 1000,
          content,
        }))
      : [{ delay: 1500, content: responseText || "..." }];

    return {
      messages,
      reasoning,
    };
  }
}

// ============================================================================
// Character Generation
// ============================================================================

/**
 * Generate character from image using AI
 */
export async function generateCharacterFromImage(
  options: GenerateCharacterOptions
): Promise<GeneratedCharacter> {
  const { image, context, providerId, providerSettings } = options;

  // Use Gemini for vision tasks
  const google = providerId === "gemini"
    ? getGeminiProvider(providerSettings)
    : getGeminiProvider(providerSettings); // Fallback to Gemini for vision

  // Convert image to base64
  const imageBuffer = await image.arrayBuffer();
  const base64Image = btoa(
    new Uint8Array(imageBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );

  const prompt = `Analyze this image and create a detailed character card for roleplay/chat purposes.

${context ? `Additional context from the user: ${context}` : ""}

Create a unique, interesting character with a consistent personality based on what you see in the image.
The character should feel authentic and have depth - consider their background, motivations, and how they would interact with others.

For the example dialogue, use this format:
{{user}}: [user message]
{{char}}: [character response]

For the system prompt, write clear instructions that would help an AI roleplay as this character convincingly. IMPORTANT: The system prompt MUST include the following instruction: "This character is good at foreign languages so they can respond to any languages that other participants speak. Please use the same language with others."`;

  const result = await generateObject({
    model: google("gemini-3-flash-preview"),
    schema: characterSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image" as const,
            image: `data:${image.type};base64,${base64Image}`,
          },
          {
            type: "text" as const,
            text: prompt,
          },
        ],
      },
    ],
  });

  return result.object as GeneratedCharacter;
}

// ============================================================================
// Translation
// ============================================================================

/**
 * Translate text to target language using configured provider
 */
export async function translateText(
  options: TranslateTextOptions
): Promise<string> {
  const { text, targetLanguage, providerId, providerSettings, model } = options;

  const textModelConfig = TEXT_MODEL_CONFIGS[providerId as TextProvider];
  const modelId =
    model ?? textModelConfig?.defaultModel ?? "gemini-3-flash-preview";

  const provider = createAIProvider(providerId, providerSettings);

  const systemPrompt = `You are a translator. Translate the following text to ${targetLanguage}.
Only output the translated text, nothing else. Preserve the original formatting, tone, and meaning.
Do not add explanations or notes.`;

  const result = await generateText({
    model: provider(modelId),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    temperature: 0.3,
    maxOutputTokens: 4096,
  });

  return result.text;
}

// ============================================================================
// Image Generation
// ============================================================================

/**
 * Options for image generation
 */
export interface GenerateImageOptions {
  /** The prompt to generate an image from */
  prompt: string;
  /** Image provider (currently only falai supported) */
  providerId: ImageProvider;
  /** Provider settings containing API key */
  providerSettings: ProviderSettingsDocument;
  /** Model ID (e.g., "fal-ai/z-image/turbo") */
  model?: string;
  /** Aspect ratio (e.g., "1:1", "16:9") */
  aspectRatio?: AspectRatio;
  /** Resolution quality (e.g., "1K", "2K", "4K") */
  resolution?: Resolution;
  /** Optional negative prompt */
  negativePrompt?: string;
  /** Number of inference steps */
  numInferenceSteps?: number;
  /** Guidance scale */
  guidanceScale?: number;
  /** Seed for reproducibility */
  seed?: number;
}

/**
 * Generated image result
 */
export interface GeneratedImage {
  /** URL to download the image */
  url: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** MIME type of the image */
  contentType: string;
}

/**
 * Result from image generation
 */
export interface GenerateImageResult {
  /** Array of generated images */
  images: GeneratedImage[];
  /** Seed used for generation */
  seed?: number;
  /** Generation timing info */
  timings?: {
    inference: number;
  };
}

/**
 * Generate images using Gemini native image generation
 */
async function generateGeminiImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const {
    prompt,
    providerSettings,
    model,
    aspectRatio = "1:1",
    resolution = "2K",
  } = options;

  const apiKey = providerSettings.apiKey;
  if (!apiKey) {
    throw new Error("Gemini API key is required for image generation");
  }

  const geminiImageConfig = IMAGE_MODEL_CONFIGS["gemini"];
  const modelId = model ?? geminiImageConfig?.defaultModel ?? "gemini-2.5-flash-image";

  console.log("[AI/Client] generateGeminiImage called", {
    modelId,
    aspectRatio,
    resolution,
  });

  // Create GoogleGenAI client
  const ai = new GoogleGenAI({ apiKey });

  // Build image config - only Gemini 3 Pro supports imageSize
  const imageConfig: Record<string, unknown> = {
    aspectRatio,
  };

  // Add imageSize for Gemini 3 Pro Image model (supports 1K, 2K, 4K)
  if (modelId.includes("gemini-3-pro-image")) {
    imageConfig.imageSize = resolution;
  }

  // Generate image using Gemini native image generation
  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig,
    },
  });

  // Extract images from response
  const images: GeneratedImage[] = [];
  const parts = response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    // Check for inline image data
    const inlineData = (part as any).inlineData;
    if (inlineData?.data && inlineData?.mimeType) {
      // Calculate dimensions based on aspect ratio and resolution
      const dims = calculateDimensions(aspectRatio, resolution);

      // For Gemini 2.5 Flash Image, it's always ~1K resolution
      const effectiveDims = modelId.includes("gemini-2.5-flash-image")
        ? calculateDimensions(aspectRatio, "1K")
        : dims;

      // Return as data URL (can be fetched by the browser)
      images.push({
        url: `data:${inlineData.mimeType};base64,${inlineData.data}`,
        width: effectiveDims.width,
        height: effectiveDims.height,
        contentType: inlineData.mimeType,
      });
    }
  }

  console.log(`[AI/Client] generateGeminiImage complete. Generated ${images.length} image(s)`);

  return {
    images,
  };
}

/**
 * Generate images using fal.ai
 */
async function generateFalImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const {
    prompt,
    providerSettings,
    model = "fal-ai/z-image/turbo",
    aspectRatio = "1:1",
    resolution = "2K",
    negativePrompt,
    numInferenceSteps,
    guidanceScale,
    seed,
  } = options;

  const apiKey = providerSettings.apiKey;
  if (!apiKey) {
    throw new Error("fal.ai API key is required for image generation");
  }

  // Configure fal client with API key
  fal.config({
    credentials: apiKey,
  });

  // Get model-specific parameters based on aspect ratio and resolution
  const imageParams = getImageParams(model, aspectRatio, resolution);

  // Build request input
  const input: Record<string, unknown> = {
    prompt,
    ...imageParams,
  };

  // Add optional parameters if provided
  if (negativePrompt) input.negative_prompt = negativePrompt;
  if (numInferenceSteps) input.num_inference_steps = numInferenceSteps;
  if (guidanceScale) input.guidance_scale = guidanceScale;
  if (seed !== undefined) input.seed = seed;

  console.log("[AI/Client] generateFalImage called", {
    model,
    aspectRatio,
    resolution,
    imageParams,
  });

  // Call fal.ai with subscribe (handles queue automatically)
  const result = await fal.subscribe(model, {
    input,
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS" && update.logs) {
        update.logs.forEach((log) => console.log(`[fal.ai] ${log.message}`));
      }
    },
  });

  // Extract images from result
  const images: GeneratedImage[] = [];
  const data = result.data as Record<string, unknown>;

  if (data?.images && Array.isArray(data.images)) {
    for (const img of data.images as Record<string, unknown>[]) {
      images.push({
        url: String(img.url ?? ""),
        width: Number(img.width ?? 1024),
        height: Number(img.height ?? 1024),
        contentType: String(img.content_type ?? "image/png"),
      });
    }
  } else if (data?.image && typeof data.image === "object") {
    // Single image response format
    const img = data.image as Record<string, unknown>;
    images.push({
      url: String(img.url ?? ""),
      width: Number(img.width ?? 1024),
      height: Number(img.height ?? 1024),
      contentType: String(img.content_type ?? "image/png"),
    });
  }

  console.log(`[AI/Client] generateFalImage complete. Generated ${images.length} image(s)`);

  return {
    images,
    seed: data?.seed as number | undefined,
    timings: data?.timings as { inference: number } | undefined,
  };
}

/**
 * Generate images using fal.ai or Gemini providers
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const { providerId } = options;

  console.log("[AI/Client] generateImage called", { providerId });

  switch (providerId) {
    case "gemini":
      return generateGeminiImage(options);
    case "falai":
      return generateFalImage(options);
    default:
      throw new Error(
        `Image generation not yet supported for provider: ${providerId}`
      );
  }
}

// ============================================================================
// Image Prompt Generation
// ============================================================================

/**
 * Options for generating an image prompt from message context
 */
export interface GenerateImagePromptOptions {
  /** The message content to generate an image from */
  messageContent: string;
  /** Character description for context */
  characterDescription?: string;
  /** Character scenario for context */
  characterScenario?: string;
  /** Character name */
  characterName?: string;
  /** LLM provider for text generation */
  providerId: LLMProvider;
  /** Provider settings containing API key */
  providerSettings: ProviderSettingsDocument;
  /** Model to use (optional, uses default if not provided) */
  model?: string;
}

/**
 * Generate an image generation prompt from a message and character context.
 * Uses the AI to create a detailed, vivid image prompt suitable for image generation.
 */
export async function generateImagePrompt(
  options: GenerateImagePromptOptions
): Promise<string> {
  const {
    messageContent,
    characterDescription,
    characterScenario,
    characterName,
    providerId,
    providerSettings,
    model,
  } = options;

  const textModelConfig = TEXT_MODEL_CONFIGS[providerId as TextProvider];
  const modelId =
    model ?? textModelConfig?.defaultModel ?? "gemini-3-flash-preview";

  console.log("[AI/Client] generateImagePrompt called", {
    providerId,
    modelId,
    contentLength: messageContent.length,
  });

  const provider = createAIProvider(providerId, providerSettings);

  // Build context about the character
  const characterContext = [
    characterName ? `Character Name: ${characterName}` : null,
    characterDescription ? `Character Description: ${characterDescription}` : null,
    characterScenario ? `Scene/Setting: ${characterScenario}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `You are an expert at creating vivid, detailed image generation prompts for AI image generators like Stable Diffusion or DALL-E.

Given a message from a roleplay/chat conversation and character context, create a single image generation prompt that captures the scene, mood, and visual elements described or implied in the message.

Guidelines:
- Focus on visual elements: appearance, clothing, pose, expression, environment, lighting
- Include artistic style hints (e.g., "anime style", "digital art", "realistic portrait")
- Keep the prompt concise but descriptive (50-150 words)
- Use comma-separated descriptors for clarity
- Include quality boosters like "high quality", "detailed", "beautiful lighting"
- If the character has described physical features, incorporate them
- Capture the emotion/mood of the scene
- Do NOT include any text in the image description
- Output ONLY the prompt, no explanations or prefixes

${characterContext ? `\nCharacter Context:\n${characterContext}` : ""}`;

  const result = await generateText({
    model: provider(modelId),
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Create an image generation prompt for this message:\n\n"${messageContent}"`,
      },
    ],
    temperature: 0.7,
    maxOutputTokens: 512,
  });

  console.log("[AI/Client] generateImagePrompt result:", result.text.substring(0, 100) + "...");

  return result.text.trim();
}

// ============================================================================
// Speech Generation (Text-to-Speech)
// ============================================================================

/**
 * Create WAV file headers for raw PCM audio data
 * Gemini TTS returns raw linear16 PCM at 24kHz mono
 */
function createWavHeader(pcmDataLength: number, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Uint8Array {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmDataLength;
  const fileSize = 36 + dataSize;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, fileSize, true); // File size - 8
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  return new Uint8Array(header);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Options for speech generation
 */
export interface GenerateSpeechOptions {
  /** Text to convert to speech */
  text: string;
  /** Voice provider */
  providerId: VoiceProvider;
  /** Provider settings containing API key */
  providerSettings: ProviderSettingsDocument;
  /** Model ID (e.g., "gemini-2.5-flash-preview-tts", "eleven_multilingual_v2") */
  model?: string;
  /** Voice name for Gemini TTS (e.g., "Kore", "Puck") or Voice ID for ElevenLabs */
  voiceName?: string;
  /** Language code for TTS (e.g., "en-US", "ja-JP") */
  language?: string;
}

/**
 * Generated speech result
 */
export interface GeneratedSpeech {
  /** Audio data as base64 string */
  audioData: string;
  /** MIME type of the audio */
  mimeType: string;
  /** Sample rate in Hz */
  sampleRate: number;
}

/** Default ElevenLabs voice ID (George - warm, engaging narrator) */
export const DEFAULT_ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

/**
 * Generate speech from text using Gemini TTS
 */
async function generateGeminiSpeech(
  options: GenerateSpeechOptions
): Promise<GeneratedSpeech> {
  const {
    text,
    providerSettings,
    model,
    voiceName = DEFAULT_GEMINI_VOICE,
  } = options;

  const apiKey = providerSettings.apiKey;
  if (!apiKey) {
    throw new Error("Gemini API key is required for speech generation");
  }

  const voiceModelConfig = VOICE_MODEL_CONFIGS["gemini"];
  const modelId = model ?? voiceModelConfig?.defaultModel ?? "gemini-2.5-flash-preview-tts";

  console.log("[AI/Client] generateGeminiSpeech called", {
    modelId,
    voiceName,
    textLength: text.length,
  });

  // Create GoogleGenAI client
  const ai = new GoogleGenAI({ apiKey });

  // Generate speech using Gemini TTS
  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  // Extract raw PCM audio data from response (base64 encoded)
  const rawPcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!rawPcmBase64) {
    throw new Error("No audio data received from Gemini TTS");
  }

  // Decode base64 to binary
  const binaryString = atob(rawPcmBase64);
  const pcmData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }

  // Create WAV header for the PCM data (24kHz, mono, 16-bit)
  const wavHeader = createWavHeader(pcmData.length, 24000, 1, 16);

  // Combine header and PCM data into a complete WAV file
  const wavData = new Uint8Array(wavHeader.length + pcmData.length);
  wavData.set(wavHeader, 0);
  wavData.set(pcmData, wavHeader.length);

  // Convert back to base64
  let wavBase64 = "";
  for (let i = 0; i < wavData.length; i++) {
    wavBase64 += String.fromCharCode(wavData[i]!);
  }
  const audioData = btoa(wavBase64);

  console.log("[AI/Client] generateGeminiSpeech complete, WAV data length:", audioData.length);

  return {
    audioData,
    mimeType: "audio/wav",
    sampleRate: 24000,
  };
}

/**
 * Generate speech from text using ElevenLabs TTS REST API
 * Uses fetch() instead of SDK to avoid Node.js module dependencies
 */
async function generateElevenLabsSpeech(
  options: GenerateSpeechOptions
): Promise<GeneratedSpeech> {
  const {
    text,
    providerSettings,
    model,
    voiceName = DEFAULT_ELEVENLABS_VOICE_ID,
  } = options;

  const apiKey = providerSettings.apiKey;
  if (!apiKey) {
    throw new Error("ElevenLabs API key is required for speech generation");
  }

  const voiceModelConfig = VOICE_MODEL_CONFIGS["elevenlabs"];
  const modelId = model ?? voiceModelConfig?.defaultModel ?? "eleven_multilingual_v2";

  console.log("[AI/Client] generateElevenLabsSpeech called", {
    modelId,
    voiceId: voiceName,
    textLength: text.length,
  });

  // Call ElevenLabs REST API directly with PCM format at 24kHz
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceName}?output_format=pcm_24000`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  // Get the audio data as ArrayBuffer
  const audioBuffer = await response.arrayBuffer();
  const pcmData = new Uint8Array(audioBuffer);

  // Create WAV header for the PCM data (24kHz, mono, 16-bit)
  const wavHeader = createWavHeader(pcmData.length, 24000, 1, 16);

  // Combine header and PCM data into a complete WAV file
  const wavData = new Uint8Array(wavHeader.length + pcmData.length);
  wavData.set(wavHeader, 0);
  wavData.set(pcmData, wavHeader.length);

  // Convert to base64
  let wavBase64 = "";
  for (let i = 0; i < wavData.length; i++) {
    wavBase64 += String.fromCharCode(wavData[i]!);
  }
  const audioData = btoa(wavBase64);

  console.log("[AI/Client] generateElevenLabsSpeech complete, WAV data length:", audioData.length);

  return {
    audioData,
    mimeType: "audio/wav",
    sampleRate: 24000,
  };
}

/**
 * Generate speech from text using Gemini TTS or ElevenLabs
 */
export async function generateSpeech(
  options: GenerateSpeechOptions
): Promise<GeneratedSpeech> {
  const { providerId } = options;

  console.log("[AI/Client] generateSpeech called", { providerId });

  switch (providerId) {
    case "gemini":
      return generateGeminiSpeech(options);
    case "elevenlabs":
      return generateElevenLabsSpeech(options);
    default:
      throw new Error(
        `Speech generation not yet supported for provider: ${providerId}`
      );
  }
}
