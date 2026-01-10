import type { CharacterDocument, PersonaDocument, LorebookEntryDocument, MessageDocument } from "~/lib/db/schemas";
import type { CharacterData, ChatMessageType } from "~/lib/connect/messages";
import type { ChatBubbleTheme } from "~/lib/db/schemas/settings";
import { generateSystemPrompt } from "./system-prompt";
import { filterMessages, convertMessagesToApiFormat, convertChatMessagesToApiFormat } from "./message-filters";

/**
 * Context for LLM generation
 * Contains all the information needed to generate responses
 */
export interface GenerationContext {
  // Core entities
  character: CharacterDocument | CharacterData;
  persona?: PersonaDocument | null;

  // Message history
  messages: MessageDocument[] | ChatMessageType[];

  // Theme and mode
  theme: ChatBubbleTheme;
  isGroupChat?: boolean;
  participantNames?: string[];

  // Legacy lorebook (deprecated - use memory instead)
  lorebookEntries?: LorebookEntryDocument[];
  enableLorebook?: boolean;

  // LRU Memory-based context (recommended)
  // Pre-fetch with getMemoryContent() from lru-memory.ts
  // This is a single string of concatenated memory content
  memoryContent?: string;

  // P2P specific
  myPeerId?: string | null;
}

/**
 * Options for building generation payload
 */
export interface BuildGenerationPayloadOptions {
  context: GenerationContext;
  newUserMessage?: string;
  maxHistoryMessages?: number;
}

/**
 * Complete generation payload ready for LLM API
 */
export interface GenerationPayload {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  systemPrompt: string;
}

/**
 * Theme-specific system prompt modifiers
 * These are appended to the base system prompt to guide output format
 */
const THEME_MODIFIERS: Record<ChatBubbleTheme, string> = {
  roleplay: `
## Response Format
Use double quotes ("") for spoken dialogue and single asterisks (*) for actions/narration.
Example: "Hello there!" *waves enthusiastically*

Keep your responses natural and immersive. Mix dialogue and actions to bring the character to life.`,

  messenger: `
## Response Format
Respond in a natural, conversational style as if texting or chatting.
Keep responses clear and straightforward without special formatting.
Be authentic to how this character would actually text or message.`,
};

/**
 * Builds complete generation payload from context
 *
 * This is the main orchestrator that combines:
 * - System prompt (character + persona + theme)
 * - LRU Memory content (pre-fetched via getMemoryContent())
 * - Message history
 *
 * Note: Lorebook matching should be done separately via updateMemoryFromLorebook()
 * before calling this function. The matched content is stored in LRU memory and
 * passed in via context.memoryContent.
 */
export function buildGenerationPayload(
  options: BuildGenerationPayloadOptions
): GenerationPayload {
  const {
    context,
    newUserMessage,
    maxHistoryMessages = 50,
  } = options;

  const {
    character,
    persona,
    theme,
    isGroupChat = false,
    participantNames = [],
    memoryContent,
    myPeerId,
    messages,
  } = context;

  // 1. Generate base system prompt
  const baseSystemPrompt = generateSystemPrompt({
    character,
    persona,
    isGroupChat,
    participantNames,
    includePersona: !isGroupChat,
  });

  // 2. Add theme-specific modifier
  const themeModifier = THEME_MODIFIERS[theme];

  // 3. Combine into final system prompt
  // Memory content (from LRU) is placed after character definition
  const systemPromptParts = [
    baseSystemPrompt,
    memoryContent ? `## Relevant Context\n${memoryContent}` : null,
    themeModifier,
  ].filter(Boolean);

  const finalSystemPrompt = systemPromptParts.join("\n\n");

  // 4. Prepare message history
  let historyMessages: Array<{ role: "user" | "assistant" | "system"; content: string }>;

  const firstMessage = messages.length > 0 ? messages[0] : null;
  if (isGroupChat && firstMessage && "senderId" in firstMessage) {
    // P2P chat messages
    const filtered = messages.slice(-maxHistoryMessages) as ChatMessageType[];
    historyMessages = convertChatMessagesToApiFormat(filtered, myPeerId);
  } else {
    // Regular chat messages
    const filtered = filterMessages(messages as MessageDocument[], {
      maxMessages: maxHistoryMessages,
      includeSystem: false,
    });
    historyMessages = convertMessagesToApiFormat(filtered);
  }

  // 5. Assemble final messages array
  const finalMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [
    { role: "system", content: finalSystemPrompt },
    ...historyMessages,
  ];

  // Add new user message if provided
  if (newUserMessage) {
    finalMessages.push({ role: "user", content: newUserMessage });
  }

  return {
    messages: finalMessages,
    systemPrompt: finalSystemPrompt,
  };
}

/**
 * Helper to create generation context from single chat
 *
 * @param params - Context parameters
 * @param params.memoryContent - Pre-fetched memory content from getMemoryContent()
 */
export function createSingleChatContext(params: {
  character: CharacterDocument;
  persona?: PersonaDocument | null;
  messages: MessageDocument[];
  theme: ChatBubbleTheme;
  memoryContent?: string;
  // Legacy params (deprecated)
  lorebookEntries?: LorebookEntryDocument[];
  enableLorebook?: boolean;
}): GenerationContext {
  return {
    character: params.character,
    persona: params.persona,
    messages: params.messages,
    theme: params.theme,
    isGroupChat: false,
    memoryContent: params.memoryContent,
    // Legacy fields for backwards compatibility
    lorebookEntries: params.lorebookEntries,
    enableLorebook: params.enableLorebook,
  };
}

/**
 * Helper to create generation context from group chat (P2P)
 */
export function createGroupChatContext(params: {
  character: CharacterData;
  messages: ChatMessageType[];
  participantNames: string[];
  theme: ChatBubbleTheme;
  myPeerId: string | null;
  memoryContent?: string;
}): GenerationContext {
  return {
    character: params.character,
    messages: params.messages,
    theme: params.theme,
    isGroupChat: true,
    participantNames: params.participantNames,
    myPeerId: params.myPeerId,
    memoryContent: params.memoryContent,
  };
}
