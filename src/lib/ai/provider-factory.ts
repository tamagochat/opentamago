"use client";

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createXai } from "@ai-sdk/xai";
import { type LLMProvider, PROVIDER_CONFIGS } from "./providers";
import type { ProviderSettingsDocument } from "~/lib/db/schemas";

/**
 * Union type of AI provider instances
 */
export type AIProviderInstance =
  | ReturnType<typeof createOpenAI>
  | ReturnType<typeof createAnthropic>
  | ReturnType<typeof createGoogleGenerativeAI>
  | ReturnType<typeof createXai>;

/**
 * Create an AI provider instance based on provider type and settings
 */
export function createAIProvider(
  providerId: LLMProvider,
  settings: ProviderSettingsDocument
): AIProviderInstance {
  const config = PROVIDER_CONFIGS[providerId];
  const apiKey = settings.apiKey;

  if (config.requiresApiKey && !apiKey) {
    throw new Error(`API key required for ${config.name}`);
  }

  switch (config.sdkPackage) {
    case "google":
      return createGoogleGenerativeAI({
        apiKey: apiKey ?? "",
      });

    case "openai":
      return createOpenAI({
        apiKey: apiKey ?? "",
        baseURL: settings.baseUrl ?? config.baseUrl,
        // OpenRouter requires these headers for attribution
        ...(providerId === "openrouter" && {
          headers: {
            "HTTP-Referer":
              typeof window !== "undefined" ? window.location.origin : "",
            "X-Title": "OpenTamago",
          },
        }),
      });

    case "anthropic":
      return createAnthropic({
        apiKey: apiKey ?? "",
      });

    case "xai":
      return createXai({
        apiKey: apiKey ?? "",
      });

    default:
      throw new Error(`Unknown SDK package: ${config.sdkPackage}`);
  }
}

/**
 * Get a model instance from a provider
 */
export function getModelFromProvider(
  provider: AIProviderInstance,
  modelId: string
) {
  return provider(modelId);
}

/**
 * Provider options for AI operations
 */
export interface ProviderOptions {
  providerId: LLMProvider;
  providerSettings: ProviderSettingsDocument;
}
