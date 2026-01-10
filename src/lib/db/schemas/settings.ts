import type { RxJsonSchema } from "rxdb";
import type { SafetySettings } from "~/lib/ai";

export type ApiMode = "server" | "client";
export type ChatBubbleTheme = "roleplay" | "messenger";

export interface SettingsDocument {
  id: string;
  apiMode: ApiMode;
  /** @deprecated Use providerSettings collection instead */
  geminiApiKey?: string;
  /** @deprecated Use providerSettings collection instead */
  defaultModel: string;
  /** @deprecated Use providerSettings.temperature instead */
  temperature: number;
  /** @deprecated Use providerSettings.maxTokens instead */
  maxTokens: number;
  /** @deprecated Use providerSettings.metadata.safetySettings instead */
  safetySettings: SafetySettings;
  chatBubbleTheme: ChatBubbleTheme;
  localeDialogDismissed: boolean;
  localeDialogShownAt?: number;
  /** Currently selected LLM provider */
  selectedProvider: string;
  /** Default persona ID for new chats */
  defaultPersonaId?: string;
  updatedAt: number;
}

export const settingsSchema: RxJsonSchema<SettingsDocument> = {
  version: 5,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 36,
    },
    apiMode: {
      type: "string",
      enum: ["server", "client"],
    },
    geminiApiKey: {
      type: "string",
    },
    defaultModel: {
      type: "string",
    },
    temperature: {
      type: "number",
      minimum: 0,
      maximum: 2,
    },
    maxTokens: {
      type: "number",
      minimum: 1,
      maximum: 8192,
    },
    safetySettings: {
      type: "object",
      properties: {
        HARM_CATEGORY_HATE_SPEECH: { type: "string" },
        HARM_CATEGORY_HARASSMENT: { type: "string" },
        HARM_CATEGORY_SEXUALLY_EXPLICIT: { type: "string" },
        HARM_CATEGORY_DANGEROUS_CONTENT: { type: "string" },
      },
    },
    chatBubbleTheme: {
      type: "string",
      enum: ["roleplay", "messenger"],
    },
    localeDialogDismissed: {
      type: "boolean",
    },
    localeDialogShownAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999,
    },
    selectedProvider: {
      type: "string",
      maxLength: 50,
    },
    defaultPersonaId: {
      type: "string",
      maxLength: 36,
    },
    updatedAt: {
      type: "number",
    },
  },
  required: ["id", "apiMode", "defaultModel", "temperature", "maxTokens", "safetySettings", "chatBubbleTheme", "localeDialogDismissed", "selectedProvider", "updatedAt"],
};
