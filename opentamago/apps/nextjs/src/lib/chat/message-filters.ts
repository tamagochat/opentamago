import type { MessageDocument } from "~/lib/db/schemas";
import type { ChatMessageType } from "~/lib/connect/messages";

/**
 * Generic message interface for filtering
 */
export interface FilterableMessage {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
  timestamp?: number;
}

/**
 * Options for message filtering
 */
export interface MessageFilterOptions {
  /** Maximum number of messages to return */
  maxMessages?: number;
  /** Whether to include system messages */
  includeSystem?: boolean;
  /** Minimum timestamp (messages after this time) */
  afterTimestamp?: number;
  /** Maximum timestamp (messages before this time) */
  beforeTimestamp?: number;
}

/**
 * Filters chat message history based on provided criteria
 *
 * For now, returns messages as-is with optional limits.
 * Future enhancements:
 * - Token-based filtering (remove oldest messages to fit context window)
 * - Importance-based filtering (keep key messages)
 * - Summarization of older messages
 *
 * @param messages - Array of messages to filter
 * @param options - Filtering options
 * @returns Filtered messages array
 */
export function filterMessages<T extends FilterableMessage>(
  messages: T[],
  options: MessageFilterOptions = {}
): T[] {
  const {
    maxMessages,
    includeSystem = true,
    afterTimestamp,
    beforeTimestamp,
  } = options;

  let filtered = [...messages];

  // Filter out system messages if requested
  if (!includeSystem) {
    filtered = filtered.filter((msg) => msg.role !== "system");
  }

  // Filter by timestamp range
  if (afterTimestamp !== undefined || beforeTimestamp !== undefined) {
    filtered = filtered.filter((msg) => {
      const msgTime = msg.createdAt ?? msg.timestamp ?? 0;
      const afterCheck = afterTimestamp === undefined || msgTime >= afterTimestamp;
      const beforeCheck = beforeTimestamp === undefined || msgTime <= beforeTimestamp;
      return afterCheck && beforeCheck;
    });
  }

  // Limit number of messages (keep most recent)
  if (maxMessages !== undefined && maxMessages > 0) {
    filtered = filtered.slice(-maxMessages);
  }

  return filtered;
}

/**
 * Converts MessageDocument to a format suitable for AI API
 */
export function convertMessagesToApiFormat(
  messages: MessageDocument[]
): Array<{ role: "user" | "assistant" | "system"; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Converts ChatMessageType (P2P) to a format suitable for AI API
 */
export function convertChatMessagesToApiFormat(
  messages: ChatMessageType[],
  myPeerId?: string | null
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages.map((msg) => ({
    role: msg.senderId === myPeerId ? "assistant" : "user",
    content: `${msg.characterName}: ${msg.content}`,
  }));
}
