/**
 * Chat utilities library
 *
 * Provides shared utilities for chat functionality across the application:
 * - System prompt generation for characters and personas
 * - Message filtering and formatting
 * - Lorebook entry matching and injection
 * - Theme-aware generation context and orchestration
 * - Unified AI response generation (streaming and non-streaming)
 * - Messenger-style chat bubbles with realistic timing
 */

export * from "./system-prompt";
export * from "./message-filters";
export * from "./lorebook-matcher";
export * from "./simple-lorebook-matcher";
export * from "./generation-context";
export * from "./generator";
export { generateMessengerChatResponse } from "./generator";

// Messenger-style chat types
export type {
  ChatBubbleMessage,
  ChatBubbleResponse,
  ChatGenerationContext,
} from "./types";

export { buildMessengerPrompt } from "./prompt-builder";
