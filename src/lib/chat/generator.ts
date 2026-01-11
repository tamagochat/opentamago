import type { LLMProvider } from "~/lib/ai";
import type { ProviderSettingsDocument } from "~/lib/db/schemas";
import {
  streamChatResponse,
  generateChatResponse,
  generateMessengerResponse,
  type ChatResponseWithReasoning,
} from "~/lib/ai/client";
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

  // Provider settings (required)
  providerId: LLMProvider;
  providerSettings: ProviderSettingsDocument;

  // Model settings
  model?: string;
  temperature?: number;
  maxTokens?: number;

  // History settings
  maxHistoryMessages?: number;

  // Abort signal for cancellation
  signal?: AbortSignal;

  // Reasoning/thinking mode options
  /** Enable reasoning/thinking mode if model supports it */
  thinking?: boolean;
  /** Budget for thinking tokens (Anthropic only, default 10000) */
  thinkingBudget?: number;
}

/**
 * Token usage information
 */
export interface GenerateUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
}

/**
 * Result from generation
 */
export interface GenerateResult {
  content: string;
  payload: GenerationPayload;
  /** Merged reasoning/thinking content from LLM (if thinking mode was enabled) */
  reasoning?: string;
  /** Token usage statistics */
  usage?: GenerateUsage;
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
    providerId,
    providerSettings,
    model,
    temperature = 0.9,
    maxTokens = 8192,
    maxHistoryMessages = 50,
    thinking = false,
    thinkingBudget,
  } = options;

  console.log("[Generator] generateResponse started", { thinking });

  // Build generation payload
  const payload = buildGenerationPayload({
    context,
    newUserMessage: userMessage,
    maxHistoryMessages,
  });

  const result = await generateChatResponse({
    messages: payload.messages,
    providerId,
    providerSettings,
    model,
    temperature,
    maxTokens,
    thinking,
    thinkingBudget,
  });

  console.log("[Generator] generateResponse complete", {
    hasReasoning: !!result.reasoning,
    hasUsage: !!result.usage,
  });

  return {
    content: result.content,
    payload,
    reasoning: result.reasoning,
    usage: result.usage,
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
    providerId,
    providerSettings,
    model,
    temperature = 0.9,
    maxTokens = 8192,
    maxHistoryMessages = 50,
    signal,
    thinking = false,
    thinkingBudget,
  } = options;

  console.log("[Generator] generateStreamingResponse started", { thinking });

  // Build generation payload
  const payload = buildGenerationPayload({
    context,
    newUserMessage: userMessage,
    maxHistoryMessages,
  });
  console.log("[Generator] Payload built, message count:", payload.messages.length);

  // Stream response
  const chunks: string[] = [];
  let reasoning: string | undefined;

  const stream = streamChatResponse({
    messages: payload.messages,
    providerId,
    providerSettings,
    model,
    temperature,
    maxTokens,
    signal,
    thinking,
    thinkingBudget,
  });

  console.log("[Generator] streamChatResponse created, starting iteration...");

  // Iterate manually to capture the generator's return value
  let iterResult = await stream.next();
  while (!iterResult.done) {
    chunks.push(iterResult.value);
    yield iterResult.value;
    iterResult = await stream.next();
  }

  // iterResult.value contains the ChatResponseWithReasoning when done
  let usage: GenerateUsage | undefined;
  if (iterResult.value) {
    const resultValue = iterResult.value as ChatResponseWithReasoning;
    reasoning = resultValue.reasoning;
    usage = resultValue.usage;
  }

  console.log("[Generator] Stream iteration complete", {
    hasReasoning: !!reasoning,
    hasUsage: !!usage,
  });

  const fullContent = chunks.join("");

  return {
    content: fullContent,
    payload,
    reasoning,
    usage,
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
    providerId,
    providerSettings,
    model,
    temperature = 0.9,
    maxTokens = 8192,
    maxHistoryMessages = 50,
    thinking = false,
    thinkingBudget,
  } = options;

  console.log("[Generator] generateMessengerChatResponse started", { thinking });

  // Build generation payload first to get messages
  const payload = buildGenerationPayload({
    context,
    newUserMessage: userMessage,
    maxHistoryMessages,
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
    messages: payload.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: Date.now(), // Approximate timestamp
    })),
    memories: context.memoryContent
      ? context.memoryContent.split("\n\n").filter(Boolean)
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

  const response = await generateMessengerResponse({
    messages: payload.messages,
    systemPrompt,
    providerId,
    providerSettings,
    model,
    temperature,
    maxTokens,
    thinking,
    thinkingBudget,
  });

  console.log("[Generator] generateMessengerChatResponse complete", { hasReasoning: !!response.reasoning });

  return response;
}
