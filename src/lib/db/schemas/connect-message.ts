import type { RxJsonSchema } from "rxdb";

export interface ConnectMessageDocument {
  id: string; // Message ID (unique)
  sessionId: string; // Session ID (for querying)
  messageData: string; // JSON stringified ChatItemType (ChatMessageType | SystemMessageType)
  timestamp: number; // For ordering
  peerId: string; // Sender peer ID
}

export const connectMessageSchema: RxJsonSchema<ConnectMessageDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100,
    },
    sessionId: {
      type: "string",
      maxLength: 100, // Required for Dexie.js because field is indexed
    },
    messageData: {
      type: "string", // JSON stringified
    },
    timestamp: {
      type: "number",
      multipleOf: 1, // Required for Dexie.js because field is indexed
      minimum: 0,
      maximum: 9999999999999,
    },
    peerId: {
      type: "string",
      maxLength: 100, // Not indexed but good practice
    },
  },
  required: ["id", "sessionId", "messageData", "timestamp", "peerId"],
  indexes: [
    ["sessionId", "timestamp"], // Compound index for efficient querying
  ],
};
