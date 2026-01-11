import type { RxJsonSchema } from "rxdb";

export interface CollectionDocument {
  id: string;
  name: string;
  description: string;
  color: string; // Hex color for UI badge (e.g., "#3b82f6")
  icon: string; // Lucide icon name (e.g., "folder", "star", "heart")
  order: number; // Sort order for display
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
}

export const collectionSchema: RxJsonSchema<CollectionDocument> = {
  version: 0,
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
    color: {
      type: "string",
      maxLength: 20,
    },
    icon: {
      type: "string",
      maxLength: 50,
    },
    order: {
      type: "number",
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999,
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
  required: ["id", "name", "color", "icon", "order", "createdAt", "updatedAt"],
  indexes: ["createdAt", "order", "name"],
};
