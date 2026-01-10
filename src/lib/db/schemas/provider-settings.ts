import type { RxJsonSchema } from "rxdb";

/**
 * Provider settings document stored in RxDB.
 * Stores API credentials for each provider (shared across all modalities).
 * Each provider (gemini, openrouter, anthropic, grok, openai, nanogpt, falai, elevenlabs) has its own document.
 */
export interface ProviderSettingsDocument {
  /** Provider ID (e.g., "gemini", "openrouter") - used as primary key */
  id: string;
  /** API key for this provider */
  apiKey?: string;
  /** Whether this provider is enabled (has valid API key) */
  enabled: boolean;
  /** Optional custom base URL override */
  baseUrl?: string;
  /** Last update timestamp */
  updatedAt: number;
}

export const providerSettingsSchema: RxJsonSchema<ProviderSettingsDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 50,
    },
    apiKey: {
      type: "string",
      // No maxLength - API keys can be long, and this field is not indexed
    },
    enabled: {
      type: "boolean",
    },
    baseUrl: {
      type: "string",
      maxLength: 500,
    },
    updatedAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999,
    },
  },
  required: ["id", "enabled", "updatedAt"],
  // No indexes needed - we query by primary key (id) only
};
