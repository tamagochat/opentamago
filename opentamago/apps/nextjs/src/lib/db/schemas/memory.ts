import type { RxJsonSchema } from "rxdb";

/**
 * Memory source types
 */
export type MemorySource = "lorebook" | "manual" | "system";

/**
 * Memory document for LRU-based context management
 *
 * Memories are used to store relevant context that should be included
 * in the prompt. They are ordered purely by updatedAt for LRU eviction.
 *
 * When the same content is added again, only updatedAt is refreshed,
 * keeping the content "hot" in the LRU cache.
 */
export interface MemoryDocument {
  id: string; // UUID or derived from chatId + contentHash
  chatId: string;
  characterId: string;
  content: string; // The interpolated content
  contentHash: string; // Hash of content for deduplication
  source: MemorySource; // Where this memory came from
  sourceId?: string; // Original source ID (e.g., lorebook entry ID)
  createdAt: number; // When first created
  updatedAt: number; // Last accessed/updated (for LRU ordering)
}

export const memorySchema: RxJsonSchema<MemoryDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100, // chatId(36) + hash(32) + separator
    },
    chatId: {
      type: "string",
      maxLength: 36,
    },
    characterId: {
      type: "string",
      maxLength: 36,
    },
    content: {
      type: "string",
    },
    contentHash: {
      type: "string",
      maxLength: 64, // SHA-256 hex
    },
    source: {
      type: "string",
      maxLength: 20,
    },
    sourceId: {
      type: "string",
      maxLength: 36,
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
    "chatId",
    "characterId",
    "content",
    "contentHash",
    "source",
    "createdAt",
    "updatedAt",
  ],
  indexes: [
    ["chatId", "updatedAt"], // Query memories by chat, sorted by LRU
  ],
};
