"use client";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, generateText, generateObject } from "ai";
import { z } from "zod";
import {
  DEFAULT_MODEL,
  DEFAULT_SAFETY_SETTINGS_ARRAY,
  toGeminiSafetySettings,
  type SafetySettings,
} from "./index";
import { createProxyAI } from "./proxy";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  messages: ChatMessage[];
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  safetySettings?: SafetySettings;
  isClientMode: boolean;
  signal?: AbortSignal;
}

export interface GenerateCharacterOptions {
  image: File;
  context?: string;
  apiKey?: string;
  isClientMode: boolean;
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

/**
 * Get the appropriate AI provider based on mode
 * - Client mode with API key: Direct Google AI
 * - Proxy mode (no API key): Routes through server proxy
 */
function getAIProvider(apiKey?: string, isClientMode?: boolean) {
  if (isClientMode && apiKey) {
    return createGoogleGenerativeAI({ apiKey });
  }
  // Use proxy mode - routes through /api/ai/proxy which injects server's API key
  return createProxyAI();
}

/**
 * Non-streaming chat API - returns complete response
 * Use this for auto-reply to ensure full response before broadcasting
 */
export async function generateChatResponse(
  options: Omit<ChatOptions, "signal">
): Promise<string> {
  const {
    messages,
    apiKey,
    model = DEFAULT_MODEL,
    temperature = 0.9,
    maxTokens = 4096,
    safetySettings,
    isClientMode,
  } = options;

  const google = getAIProvider(apiKey, isClientMode);
  const geminiSafetySettings = safetySettings
    ? toGeminiSafetySettings(safetySettings)
    : [...DEFAULT_SAFETY_SETTINGS_ARRAY];

  const result = await generateText({
    model: google(model),
    messages,
    temperature,
    maxOutputTokens: maxTokens,
    providerOptions: {
      google: {
        safetySettings: geminiSafetySettings,
      },
    },
  });

  return result.text;
}

/**
 * Streaming chat API - yields chunks as they arrive
 * Use this for real-time chat responses
 */
export async function* streamChatResponse(
  options: ChatOptions
): AsyncGenerator<string, string, unknown> {
  const {
    messages,
    apiKey,
    model = DEFAULT_MODEL,
    temperature = 0.9,
    maxTokens = 4096,
    safetySettings,
    isClientMode,
    signal,
  } = options;

  const google = getAIProvider(apiKey, isClientMode);
  const geminiSafetySettings = safetySettings
    ? toGeminiSafetySettings(safetySettings)
    : [...DEFAULT_SAFETY_SETTINGS_ARRAY];

  const result = streamText({
    model: google(model),
    messages,
    temperature,
    maxOutputTokens: maxTokens,
    providerOptions: {
      google: {
        safetySettings: geminiSafetySettings,
      },
    },
    abortSignal: signal,
  });

  // Collect all chunks to ensure complete response
  const chunks: string[] = [];
  for await (const chunk of result.textStream) {
    chunks.push(chunk);
    yield chunk;
  }

  // Wait for the stream to fully complete
  await result.text;

  return chunks.join("");
}

/**
 * Generate character from image using AI
 */
export async function generateCharacterFromImage(
  options: GenerateCharacterOptions
): Promise<GeneratedCharacter> {
  const { image, context, apiKey, isClientMode } = options;

  const google = getAIProvider(apiKey, isClientMode);

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
