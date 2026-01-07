/**
 * Types for LLM-generated chat responses
 * Used for messenger-style chat bubbles with realistic timing
 */

/**
 * Single message in a burst of messages
 */
export interface ChatBubbleMessage {
  /** Delay in milliseconds before sending this message (simulates typing time) */
  delay: number;
  /** The actual message content */
  content: string;
}

/**
 * LLM response structure for generating realistic chat bubbles
 */
export interface ChatBubbleResponse {
  /** Array of messages to send in sequence (simulates multiple chat bubbles) */
  messages: ChatBubbleMessage[];
  /** Optional memory to store (only for significant events) */
  memory?: string;
}

/**
 * Context passed to the LLM for generating responses
 */
export interface ChatGenerationContext {
  /** Character profile information */
  character: {
    name: string;
    personality: string;
    scenario: string;
    exampleDialogue?: string;
  };
  /** User/persona information */
  user: {
    name: string;
    description?: string;
  };
  /** Recent conversation history */
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>;
  /** Recent memories for this chat */
  memories?: string[];
  /** Whether to request a memory summary */
  requestMemorySummary?: boolean;
  /** Current date and time for context */
  currentDateTime: string;
}

/**
 * Delay ranges for different conversation types
 */
export const DelayRanges = {
  /** Quick/excited responses: 500-2000ms */
  quick: { min: 500, max: 2000 },
  /** Casual chat: 1000-3000ms */
  casual: { min: 1000, max: 3000 },
  /** Thoughtful/complex responses: 3000-10000ms */
  thoughtful: { min: 3000, max: 10000 },
  /** Very long thinking time: 10000-30000ms */
  deepThought: { min: 10000, max: 30000 },
} as const;

/**
 * Helper to generate random delay within a range
 */
export function getRandomDelay(
  min: number,
  max: number,
  messageLength?: number
): number {
  // Base delay
  let delay = Math.floor(Math.random() * (max - min + 1)) + min;

  // Adjust based on message length (longer messages = slightly longer delay)
  if (messageLength) {
    const lengthFactor = Math.min(messageLength / 100, 2); // Cap at 2x
    delay = Math.floor(delay * (1 + lengthFactor * 0.3));
  }

  return delay;
}
