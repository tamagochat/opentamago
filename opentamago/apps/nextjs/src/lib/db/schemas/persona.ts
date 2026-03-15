import type { RxJsonSchema } from "rxdb";

export interface PersonaDocument {
  id: string;
  name: string;
  description: string;
  avatarData?: string; // base64 encoded image
  createdAt: number;
  updatedAt: number;
}

export const personaSchema: RxJsonSchema<PersonaDocument> = {
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
    avatarData: {
      type: "string",
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
  required: ["id", "name", "createdAt", "updatedAt"],
  indexes: ["createdAt", "updatedAt", "name"],
};
