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
  creatorNotes: string;
  tags: string[];
  avatarData?: string; // base64 encoded image
  createdAt: number;
  updatedAt: number;
}

export const characterSchema: RxJsonSchema<CharacterDocument> = {
  version: 1,
  primaryKey: "id",
  type: "object",
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
    creatorNotes: {
      type: "string",
    },
    tags: {
      type: "array",
      items: {
        type: "string",
      },
    },
    avatarData: {
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
  },
  required: ["id", "name", "createdAt", "updatedAt"],
  indexes: ["createdAt", "updatedAt", "name"],
};
