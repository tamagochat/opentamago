import type { RxJsonSchema } from "rxdb";

export interface MemoryDocument {
  id: string;
  chatId: string;
  characterId: string;
  content: string; // The memory content (third-person summary)
  createdAt: number; // When the memory was created
}

export const memorySchema: RxJsonSchema<MemoryDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 36,
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
    createdAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999,
    },
  },
  required: ["id", "chatId", "characterId", "content", "createdAt"],
  indexes: [
    ["chatId", "createdAt"], // Query memories by chat, sorted by time
  ],
};
