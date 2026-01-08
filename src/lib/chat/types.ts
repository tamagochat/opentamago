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
