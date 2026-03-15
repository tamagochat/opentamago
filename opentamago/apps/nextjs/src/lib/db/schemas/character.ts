import type { RxJsonSchema } from "rxdb";

export interface CharacterDocument {
  id: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleDialogue: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  alternateGreetings: string[];
  creatorNotes: string;
  tags: string[];
  creator: string;
  characterVersion: string;
  groupOnlyGreetings: string[];
  nickname: string;
  extensions: Record<string, unknown>; // Application-specific data (CCv3)
  creatorNotesMultilingual?: Record<string, string>; // Multilingual creator notes (CCv3)
  source?: string[]; // Source URLs/IDs (CCv3)
  avatarData?: string; // base64 encoded image
  collectionId?: string; // Optional collection/folder reference
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
}

export const characterSchema: RxJsonSchema<CharacterDocument> = {
  version: 5,
  primaryKey: "id",
  type: "object",
  attachments: {
    encrypted: false,
  },
  properties: {
    id: {
      type: "string",
      maxLength: 36,
    },
    name: {
      type: "string",
      maxLength: 500,
    },
    description: {
      type: "string",
    },
    personality: {
      type: "string",
    },
    scenario: {
      type: "string",
    },
    firstMessage: {
      type: "string",
    },
    exampleDialogue: {
      type: "string",
    },
    systemPrompt: {
      type: "string",
    },
    postHistoryInstructions: {
      type: "string",
    },
    alternateGreetings: {
      type: "array",
      items: {
        type: "string",
      },
    },
    creatorNotes: {
      type: "string",
    },
    tags: {
      type: "array",
      items: {
        type: "string",
      },
    },
    creator: {
      type: "string",
    },
    characterVersion: {
      type: "string",
    },
    groupOnlyGreetings: {
      type: "array",
      items: {
        type: "string",
      },
    },
    nickname: {
      type: "string",
    },
    extensions: {
      type: "object",
      additionalProperties: true,
    },
    creatorNotesMultilingual: {
      type: "object",
      additionalProperties: true,
    },
    source: {
      type: "array",
      items: {
        type: "string",
      },
    },
    avatarData: {
      type: "string",
    },
    collectionId: {
      type: "string",
      maxLength: 36,
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
  },
  required: ["id", "name", "extensions", "createdAt", "updatedAt"],
  indexes: ["createdAt", "updatedAt", "name"],
};
