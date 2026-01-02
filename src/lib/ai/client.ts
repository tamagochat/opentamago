"use client";

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, generateObject } from "ai";
import { z } from "zod";
import {
  DEFAULT_MODEL,
  DEFAULT_SAFETY_SETTINGS_ARRAY,
  toGeminiSafetySettings,
  type SafetySettings,
} from "./index";

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

  if (isClientMode && apiKey) {
    // Client mode: call Gemini directly
    const google = createGoogleGenerativeAI({ apiKey });
    const geminiSafetySettings = safetySettings
      ? toGeminiSafetySettings(safetySettings)
      : [...DEFAULT_SAFETY_SETTINGS_ARRAY];

    const { generateText } = await import("ai");
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
  } else {
    // Server mode: call our non-streaming API
    const response = await fetch("/api/chat/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        ...(apiKey && { apiKey }),
        model,
        temperature,
        maxTokens,
        safetySettings,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed: ${response.status}`);
    }

    const data = await response.json() as { text: string };
    return data.text;
  }
}

/**
 * Call chat API - either directly to Gemini (client mode) or through server
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

  if (isClientMode && apiKey) {
    // Client mode: call Gemini directly
    const google = createGoogleGenerativeAI({ apiKey });
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
  } else {
    // Server mode: call our API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        ...(apiKey && { apiKey }),
        model,
        temperature,
        maxTokens,
        safetySettings,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        yield chunk;
      }

      // Flush any remaining bytes in the decoder buffer
      const remaining = decoder.decode();
      if (remaining) {
        fullContent += remaining;
        yield remaining;
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }
}

/**
 * Generate character from image - either directly to Gemini (client mode) or through server
 */
export async function generateCharacterFromImage(
  options: GenerateCharacterOptions
): Promise<GeneratedCharacter> {
  const { image, context, apiKey, isClientMode } = options;

  if (isClientMode && apiKey) {
    // Client mode: call Gemini directly
    const google = createGoogleGenerativeAI({ apiKey });

    // Convert image to base64
    const imageBuffer = await image.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");

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
  } else {
    // Server mode: call our API
    const formData = new FormData();
    formData.append("image", image);
    if (apiKey) {
      formData.append("apiKey", apiKey);
    }
    if (context) {
      formData.append("context", context);
    }

    const response = await fetch("/api/generate-character", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed: ${response.status}`);
    }

    return (await response.json()) as GeneratedCharacter;
  }
}
