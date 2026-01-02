import type { RxJsonSchema } from "rxdb";

export interface MessageDocument {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  editedAt?: number;
}

export const messageSchema: RxJsonSchema<MessageDocument> = {
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
    role: {
      type: "string",
      enum: ["user", "assistant", "system"],
    },
    content: {
      type: "string",
    },
    createdAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999, // Year 2286
    },
    editedAt: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999, // Year 2286
    },
  },
  required: ["id", "chatId", "role", "content", "createdAt"],
  indexes: [["chatId", "createdAt"]],
};
