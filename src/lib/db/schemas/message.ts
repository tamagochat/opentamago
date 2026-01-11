import type { RxJsonSchema } from "rxdb";

/**
 * Token usage information for a message
 */
export interface MessageTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  reasoningTokens?: number;
}

/**
 * Metadata for a message attachment (image or audio)
 * The actual binary data is stored as RxDB attachments
 */
export interface MessageAttachmentMeta {
  /** Attachment ID - matches RxDB attachment ID */
  id: string;
  /** Attachment type */
  type: "image" | "audio";
  /** MIME type (e.g., "image/png", "audio/mpeg") */
  mimeType: string;
  /** When the attachment was generated */
  generatedAt: number;
  /** The prompt used to generate this attachment */
  prompt?: string;
  /** Audio duration in seconds */
  duration?: number;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

export interface MessageDocument {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  editedAt?: number;
  /** Merged reasoning/thinking content from LLM (for assistant messages) */
  reasoning?: string;
  /** Translated or alternative displayed content */
  displayedContent?: string;
  /** Language code of displayedContent (e.g., "ko", "ja", "en") */
  displayedContentLanguage?: string;
  /** Metadata for attachments (images, audio) - binary data stored as RxDB attachments */
  attachmentsMeta?: MessageAttachmentMeta[];
  /** Token usage statistics from AI response */
  tokenUsage?: MessageTokenUsage;
}

export const messageSchema: RxJsonSchema<MessageDocument> = {
  version: 3,
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
    reasoning: {
      type: "string",
    },
    displayedContent: {
      type: "string",
    },
    displayedContentLanguage: {
      type: "string",
      maxLength: 10,
    },
    attachmentsMeta: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", maxLength: 100 },
          type: { type: "string", enum: ["image", "audio"], maxLength: 10 },
          mimeType: { type: "string", maxLength: 50 },
          generatedAt: {
            type: "number",
            multipleOf: 1,
            minimum: 0,
            maximum: 9999999999999,
          },
          prompt: { type: "string" },
          duration: { type: "number", multipleOf: 0.01, minimum: 0, maximum: 999999 },
          width: { type: "number", multipleOf: 1, minimum: 0, maximum: 99999 },
          height: { type: "number", multipleOf: 1, minimum: 0, maximum: 99999 },
        },
        required: ["id", "type", "mimeType", "generatedAt"],
      },
    },
    tokenUsage: {
      type: "object",
      properties: {
        inputTokens: {
          type: "number",
          multipleOf: 1,
          minimum: 0,
          maximum: 9999999,
        },
        outputTokens: {
          type: "number",
          multipleOf: 1,
          minimum: 0,
          maximum: 9999999,
        },
        totalTokens: {
          type: "number",
          multipleOf: 1,
          minimum: 0,
          maximum: 9999999,
        },
        reasoningTokens: {
          type: "number",
          multipleOf: 1,
          minimum: 0,
          maximum: 9999999,
        },
      },
    },
  },
  required: ["id", "chatId", "role", "content", "createdAt"],
  indexes: [["chatId", "createdAt"]],
};
