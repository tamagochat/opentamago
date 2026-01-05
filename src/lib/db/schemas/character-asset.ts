import type { RxJsonSchema } from "rxdb";

/**
 * Character asset schema for storing images from CharX
 * Assets are stored as RxDB attachments with metadata
 */
export interface CharacterAssetDocument {
  id: string; // UUID primary key
  characterId: string; // Foreign key to characters collection
  assetType: "icon" | "emotion" | "background" | "other"; // Asset category
  name: string; // Asset name from CharX
  uri: string; // Original URI from CharX (e.g., "assets/emotions/happy.png")
  ext: string; // File extension
  createdAt: number;
  updatedAt: number;
}

export const characterAssetSchema: RxJsonSchema<CharacterAssetDocument> = {
  version: 0,
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
    characterId: {
      type: "string",
      maxLength: 36,
    },
    assetType: {
      type: "string",
      enum: ["icon", "emotion", "background", "other"],
      maxLength: 20, // Longest value is "background" (10 chars)
    },
    name: {
      type: "string",
    },
    uri: {
      type: "string",
    },
    ext: {
      type: "string",
      maxLength: 10,
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
    "assetType",
    "name",
    "uri",
    "ext",
    "createdAt",
    "updatedAt",
  ],
  indexes: ["characterId", ["characterId", "assetType"]],
};
