import type { RxJsonSchema } from "rxdb";

/**
 * Lorebook entry schema for character world information
 * Based on CharacterCardV3 lorebook format
 */
export interface LorebookEntryDocument {
  id: string; // UUID primary key
  characterId: string; // Foreign key to characters collection
  keys: string[]; // Trigger keywords (or regex patterns if useRegex=true)
  content: string; // Entry content
  enabled: boolean; // Whether entry is active
  insertionOrder: number; // Order in prompt
  caseSensitive: boolean; // Case-sensitive matching
  priority: number; // Entry priority
  selective: boolean; // Selective activation
  secondaryKeys: string[]; // Additional trigger keywords
  constant: boolean; // Always active
  position: string; // Position in prompt (before_char, after_char, etc.)
  useRegex: boolean; // Whether keys are regex patterns (CCv3 required)
  extensions: Record<string, unknown>; // Application-specific data (CCv3)
  name?: string; // Optional entry name for organization
  comment?: string; // Optional comment/note
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
}

export const lorebookEntrySchema: RxJsonSchema<LorebookEntryDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 36,
    },
    characterId: {
      type: "string",
      maxLength: 36,
    },
    keys: {
      type: "array",
      items: {
        type: "string",
      },
    },
    content: {
      type: "string",
    },
    enabled: {
      type: "boolean",
    },
    insertionOrder: {
      type: "number",
    },
    caseSensitive: {
      type: "boolean",
    },
    priority: {
      type: "number",
    },
    selective: {
      type: "boolean",
    },
    secondaryKeys: {
      type: "array",
      items: {
        type: "string",
      },
    },
    constant: {
      type: "boolean",
    },
    position: {
      type: "string",
    },
    useRegex: {
      type: "boolean",
    },
    extensions: {
      type: "object",
      additionalProperties: true,
    },
    name: {
      type: "string",
    },
    comment: {
      type: "string",
    },
    createdAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999,
    },
    updatedAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999,
    },
  },
  required: [
    "id",
    "characterId",
    "keys",
    "content",
    "enabled",
    "insertionOrder",
    "caseSensitive",
    "priority",
    "selective",
    "secondaryKeys",
    "constant",
    "position",
    "useRegex",
    "extensions",
    "createdAt",
    "updatedAt",
  ],
  indexes: ["characterId", "createdAt"],
};
