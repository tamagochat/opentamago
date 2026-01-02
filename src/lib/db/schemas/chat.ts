import type { RxJsonSchema } from "rxdb";

export interface ChatDocument {
  id: string;
  characterId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessageAt: number;
}

export const chatSchema: RxJsonSchema<ChatDocument> = {
  version: 0,
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
    title: {
      type: "string",
    },
    createdAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999, // Year 2286
    },
    updatedAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999, // Year 2286
    },
    lastMessageAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999, // Year 2286
    },
  },
  required: ["id", "characterId", "title", "createdAt", "updatedAt", "lastMessageAt"],
  indexes: ["characterId", "lastMessageAt", "createdAt"],
};
