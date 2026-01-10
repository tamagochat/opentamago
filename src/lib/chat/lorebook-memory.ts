import type { LorebookEntryDocument } from "~/lib/db/schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = any;
import {
  matchLorebooksSimple,
  interpolateLorebookContent,
  type LorebookInterpolationContext,
  type SimpleLorebookMatchOptions,
} from "./simple-lorebook-matcher";
import {
  addToMemory,
  pruneMemory,
  DEFAULT_MEMORY_LIMIT,
  type AddToMemoryParams,
} from "./lru-memory";

/**
 * Options for updating memory from lorebook
 */
export interface UpdateMemoryFromLorebookOptions {
  /** The message to match against */
  message: string;
  /** Available lorebook entries */
  lorebookEntries: LorebookEntryDocument[];
  /** Chat ID for memory storage */
  chatId: string;
  /** Character ID for memory storage */
  characterId: string;
  /** Interpolation context for {{user}}/{{char}} replacement */
  interpolationContext: LorebookInterpolationContext;
  /** Maximum memory entries to keep (default: 50) */
  maxMemorySize?: number;
  /**
   * Allow entries containing {{user}} placeholder
   * Set to false for group chats (e.g., /p2p/connect)
   * @default true
   */
  allowUser?: boolean;
  /**
   * Allow entries containing {{char}} placeholder
   * @default true
   */
  allowCharacter?: boolean;
  /**
   * Enable recursive scanning of matched lorebook content
   * When true, matched entries' content is scanned for additional matches
   * @default true
   */
  recursiveScanning?: boolean;
}

/**
 * Result of lorebook memory update
 */
export interface LorebookMemoryUpdateResult {
  /** Number of lorebook entries matched */
  matchedCount: number;
  /** Number of memory entries added/updated */
  memoryUpdatedCount: number;
  /** Number of entries pruned due to memory limit */
  prunedCount: number;
  /** IDs of matched lorebook entries */
  matchedEntryIds: string[];
}

/**
 * Update memory from matched lorebook entries
 *
 * This function:
 * 1. Matches the message against lorebook entries
 * 2. Interpolates {{user}}/{{char}} placeholders
 * 3. Adds matched content to LRU memory
 * 4. Prunes memory if over the limit
 *
 * Call this function:
 * - Before sending a user message
 * - After receiving an assistant message
 *
 * @param db - RxDB database instance
 * @param options - Update options
 * @returns Result of the update operation
 */
export async function updateMemoryFromLorebook(
  db: AnyDatabase,
  options: UpdateMemoryFromLorebookOptions
): Promise<LorebookMemoryUpdateResult> {
  const {
    message,
    lorebookEntries,
    chatId,
    characterId,
    interpolationContext,
    maxMemorySize = DEFAULT_MEMORY_LIMIT,
    allowUser = true,
    allowCharacter = true,
    recursiveScanning = true,
  } = options;

  // Skip if no entries or no message
  if (lorebookEntries.length === 0 || !message.trim()) {
    return {
      matchedCount: 0,
      memoryUpdatedCount: 0,
      prunedCount: 0,
      matchedEntryIds: [],
    };
  }

  // Build match options
  const matchOptions: SimpleLorebookMatchOptions = {
    allowUser,
    allowCharacter,
    recursiveScanning,
  };

  // Match lorebooks against the message
  const matchResult = matchLorebooksSimple(message, lorebookEntries, matchOptions);
  const allMatched = [...matchResult.beforeChar, ...matchResult.afterChar];

  if (allMatched.length === 0) {
    return {
      matchedCount: 0,
      memoryUpdatedCount: 0,
      prunedCount: 0,
      matchedEntryIds: [],
    };
  }

  // Convert matched entries to memory params
  const memoryParams: AddToMemoryParams[] = [];

  // Combine all matched entries (both positions are treated the same in LRU memory)
  const allEntries = [...matchResult.beforeChar, ...matchResult.afterChar];

  for (const entry of allEntries) {
    const interpolatedContent = interpolateLorebookContent(
      entry.content,
      interpolationContext
    );

    memoryParams.push({
      chatId,
      characterId,
      content: interpolatedContent,
      source: "lorebook",
      sourceId: entry.id,
    });
  }

  // Add to memory
  let memoryUpdatedCount = 0;
  for (const params of memoryParams) {
    await addToMemory(db, params);
    memoryUpdatedCount++;
  }

  // Prune if over limit
  const prunedCount = await pruneMemory(db, chatId, maxMemorySize);

  return {
    matchedCount: allMatched.length,
    memoryUpdatedCount,
    prunedCount,
    matchedEntryIds: allMatched.map((e) => e.id),
  };
}

/**
 * Convenience function to update memory from both user and assistant messages
 *
 * @param db - RxDB database instance
 * @param options - Base options without message
 * @param userMessage - Optional user message to match
 * @param assistantMessage - Optional assistant message to match
 * @returns Combined result
 */
export async function updateMemoryFromMessages(
  db: AnyDatabase,
  options: Omit<UpdateMemoryFromLorebookOptions, "message">,
  userMessage?: string,
  assistantMessage?: string
): Promise<LorebookMemoryUpdateResult> {
  const results: LorebookMemoryUpdateResult[] = [];

  if (userMessage?.trim()) {
    const result = await updateMemoryFromLorebook(db, {
      ...options,
      message: userMessage,
    });
    results.push(result);
  }

  if (assistantMessage?.trim()) {
    const result = await updateMemoryFromLorebook(db, {
      ...options,
      message: assistantMessage,
    });
    results.push(result);
  }

  // Aggregate results
  return {
    matchedCount: results.reduce((sum, r) => sum + r.matchedCount, 0),
    memoryUpdatedCount: results.reduce((sum, r) => sum + r.memoryUpdatedCount, 0),
    prunedCount: results.reduce((sum, r) => sum + r.prunedCount, 0),
    matchedEntryIds: results.flatMap((r) => r.matchedEntryIds),
  };
}
