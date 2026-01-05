import type { RxJsonSchema } from "rxdb";
import type { CharacterData } from "~/lib/connect/messages";

export interface ConnectSessionDocument {
  id: string; // Primary key (use "active" for single session)
  sessionId: string; // Connect session ID from database
  slug: string; // Session slug for URL
  hostPeerId: string; // Host's peer ID
  isHost: boolean; // Am I the host?
  myPeerId: string; // My peer ID
  myCharacter: CharacterData; // My character data
  participants: string; // JSON stringified Participant[]
  wasInChat: boolean; // Was I in chat room? (for rejoin UI)
  createdAt: number; // Timestamp
  updatedAt: number; // Timestamp
}

export const connectSessionSchema: RxJsonSchema<ConnectSessionDocument> = {
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 36,
    },
    sessionId: {
      type: "string",
      maxLength: 100,
    },
    slug: {
      type: "string",
      maxLength: 200,
    },
    hostPeerId: {
      type: "string",
      maxLength: 100,
    },
    isHost: {
      type: "boolean",
    },
    myPeerId: {
      type: "string",
      maxLength: 100,
    },
    myCharacter: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        personality: { type: "string" },
        scenario: { type: "string" },
        firstMessage: { type: "string" },
        exampleDialogue: { type: "string" },
        systemPrompt: { type: "string" },
        avatar: { type: "string" },
      },
      required: [
        "id",
        "name",
        "description",
        "personality",
        "scenario",
        "firstMessage",
        "exampleDialogue",
        "systemPrompt",
      ],
    },
    participants: {
      type: "string", // JSON stringified
    },
    wasInChat: {
      type: "boolean",
    },
    createdAt: {
      type: "number",
    },
    updatedAt: {
      type: "number",
    },
  },
  required: [
    "id",
    "sessionId",
    "slug",
    "hostPeerId",
    "isHost",
    "myPeerId",
    "myCharacter",
    "participants",
    "wasInChat",
    "createdAt",
    "updatedAt",
  ],
};
