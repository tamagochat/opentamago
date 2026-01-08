import type { SafetySettings } from "~/lib/ai";
import { streamChatResponse, generateChatResponse, generateMessengerResponse } from "~/lib/ai/client";
import {
  buildGenerationPayload,
  type GenerationContext,
  type GenerationPayload,
} from "./generation-context";
import { buildMessengerPrompt } from "./prompt-builder";
import type { ChatBubbleResponse } from "./types";

/**
 * Options for generating AI responses
 */
export interface GenerateOptions {
  // Generation context
  context: GenerationContext;

  // New user message to respond to (optional - if not provided, uses messages from context)
  userMessage?: string;

  // AI model settings
  apiKey?: string | null;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  safetySettings?: SafetySettings;
  isClientMode?: boolean;

  // History settings
  maxHistoryMessages?: number;

  // Lorebook settings
  lorebookLimit?: number;

  // Abort signal for cancellation
  signal?: AbortSignal;
}

/**
 * Result from generation
 */
export interface GenerateResult {
  content: string;
  payload: GenerationPayload;
}

/**
 * Generate a complete AI response (non-streaming)
 * Use this for auto-reply or when you need the full response at once
 */
export async function generateResponse(
  options: Omit<GenerateOptions, "signal">
): Promise<GenerateResult> {
  const {
    context,
    userMessage,
    apiKey,
    model = "gemini-3-flash-preview",
    temperature = 0.9,
    maxTokens = 8192,
    safetySettings,
    isClientMode = false,
    maxHistoryMessages = 50,
    lorebookLimit = 3,
  } = options;

  // Build generation payload
  const payload = buildGenerationPayload({
    context,
    newUserMessage: userMessage,
    maxHistoryMessages,
    lorebookLimit,
  });

  // Generate response
  const content = await generateChatResponse({
    messages: payload.messages,
    apiKey: apiKey ?? undefined,
    model,
    temperature,
    maxTokens,
    safetySettings,
    isClientMode,
  });

  return {
    content,
    payload,
  };
}

/**
 * Generate a streaming AI response
 * Use this for real-time chat where you want to show text as it's generated
 */
export async function* generateStreamingResponse(
  options: GenerateOptions
): AsyncGenerator<string, GenerateResult, unknown> {
  const {
    context,
    userMessage,
    apiKey,
    model = "gemini-3-flash-preview",
    temperature = 0.9,
    maxTokens = 8192,
    safetySettings,
    isClientMode = false,
    maxHistoryMessages = 50,
    lorebookLimit = 3,
    signal,
  } = options;

  console.log("[Generator] generateStreamingResponse started");

  // Build generation payload
  const payload = buildGenerationPayload({
    context,
    newUserMessage: userMessage,
    maxHistoryMessages,
    lorebookLimit,
  });
  console.log("[Generator] Payload built, message count:", payload.messages.length);

  // Stream response
  const chunks: string[] = [];
  console.log("[Generator] Creating streamChatResponse...");
  const stream = streamChatResponse({
    messages: payload.messages,
    apiKey: apiKey ?? undefined,
    model,
    temperature,
    maxTokens,
    safetySettings,
    isClientMode,
    signal,
  });
  console.log("[Generator] streamChatResponse created, starting iteration...");

  for await (const chunk of stream) {
    chunks.push(chunk);
    yield chunk;
  }

  console.log("[Generator] Stream iteration complete");

  const fullContent = chunks.join("");

  return {
    content: fullContent,
    payload,
  };
}

/**
 * Generate a messenger-style structured response
 * Returns JSON with array of messages (each with delay and content)
 */
export async function generateMessengerChatResponse(
  options: Omit<GenerateOptions, "signal">
): Promise<ChatBubbleResponse> {
  const {
    context,
    userMessage,
    apiKey,
    model = "gemini-3-flash-preview",
    temperature = 0.9,
    maxTokens = 8192,
    safetySettings,
    isClientMode = false,
    maxHistoryMessages = 50,
  } = options;

  // Build generation payload first to get messages
  const payload = buildGenerationPayload({
    context,
    newUserMessage: userMessage,
    maxHistoryMessages,
    lorebookLimit: 0, // Lorebook not needed for messenger mode
  });

  // Build messenger-specific system prompt
  const systemPrompt = buildMessengerPrompt({
    character: {
      name: context.character.name,
      personality: context.character.personality,
      scenario: context.character.scenario,
      exampleDialogue: context.character.exampleDialogue,
    },
    user: {
      name: context.persona?.name ?? "User",
      description: context.persona?.description,
    },
    messages: payload.messages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: Date.now(), // Approximate timestamp
    })),
    memories: context.enableMemory && context.memoryContext
      ? context.memoryContext.split('\n').filter(Boolean)
      : [],
    currentDateTime: new Date().toLocaleString("ko-KR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  });

  // Generate structured response
  const response = await generateMessengerResponse({
    messages: payload.messages,
    systemPrompt,
    apiKey: apiKey ?? undefined,
    model,
    temperature,
    maxTokens,
    safetySettings,
    isClientMode,
  });

  return response;
}
