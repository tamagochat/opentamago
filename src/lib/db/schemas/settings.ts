import type { RxJsonSchema } from "rxdb";
import type { SafetySettings } from "~/lib/ai";

export interface SettingsDocument {
  id: string;
  geminiApiKey?: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  safetySettings: SafetySettings;
  updatedAt: number;
}

export const settingsSchema: RxJsonSchema<SettingsDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 36,
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
    updatedAt: {
      type: "number",
    },
  },
  required: ["id", "defaultModel", "temperature", "maxTokens", "safetySettings", "updatedAt"],
};
