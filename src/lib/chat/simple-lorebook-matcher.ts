/**
 * Simple Lorebook Matcher
 *
 * This module provides keyword-based matching for lorebook entries.
 *
 * ## Memory-Based Architecture (Recommended)
 *
 * Instead of adding lorebook content directly to prompts, the recommended
 * approach is to use the LRU memory system:
 *
 * 1. On each message (user or assistant), run `updateMemoryFromLorebook()`
 * 2. This adds matched lorebook content to the LRU memory database
 * 3. When generating, fetch memory with `getMemoryContent()` and include in prompt
 *
 * Benefits:
 * - Memory persists across sessions
 * - LRU ensures relevant content stays active
 * - No complex message aggregation needed
 * - Constant entries maintain presence through repeated matching
 *
 * See: `lorebook-memory.ts` and `lru-memory.ts` for implementation.
 */

import type { LorebookEntryDocument } from "~/lib/db/schemas";

/**
 * Simple lorebook matching result grouped by position
 */
export interface SimpleLorebookMatchResult {
  beforeChar: LorebookEntryDocument[];
  afterChar: LorebookEntryDocument[];
}

/**
 * Context for interpolating lorebook content
 */
export interface LorebookInterpolationContext {
  /** Persona name - replaces {{user}} */
  userName?: string;
  /** Character name - replaces {{char}} */
  charName?: string;
}

/**
 * Options for lorebook matching
 */
export interface SimpleLorebookMatchOptions {
  /**
   * Allow entries containing {{user}} placeholder
   * Set to false for group chats where {{user}} doesn't make sense
   * @default true
   */
  allowUser?: boolean;
  /**
   * Allow entries containing {{char}} placeholder
   * @default true
   */
  allowCharacter?: boolean;
  /**
   * Enable recursive scanning
   *
   * When true, matched lorebook entries' content is also scanned for additional
   * matches, continuing until no new matches are found. This allows lorebook
   * entries to reference each other through keywords.
   *
   * The memory manager handles which entries are actually injected into the prompt.
   *
   * @default true
   */
  recursiveScanning?: boolean;
}

/**
 * Interpolate placeholders in lorebook content
 *
 * Supported placeholders:
 * - {{user}} - Replaced with persona name
 * - {{char}} - Replaced with character name
 *
 * @param content - The content to interpolate
 * @param context - The interpolation context
 * @returns Interpolated content
 */
export function interpolateLorebookContent(
  content: string,
  context: LorebookInterpolationContext
): string {
  let result = content;

  if (context.userName) {
    result = result.replace(/\{\{user\}\}/gi, context.userName);
  }

  if (context.charName) {
    result = result.replace(/\{\{char\}\}/gi, context.charName);
  }

  return result;
}

/**
 * Check if content contains {{user}} placeholder (case-insensitive)
 */
function containsUserPlaceholder(content: string): boolean {
  return /\{\{user\}\}/i.test(content);
}

/**
 * Check if content contains {{char}} placeholder (case-insensitive)
 */
function containsCharPlaceholder(content: string): boolean {
  return /\{\{char\}\}/i.test(content);
}

/**
 * Check if a message matches any key in an entry
 */
function matchesEntryKeys(
  message: string,
  entry: LorebookEntryDocument
): boolean {
  if (entry.keys.length === 0) return false;

  const messageLower = message.toLowerCase();
  return entry.keys.some((key) => {
    if (!key || key.trim().length === 0) return false;
    const keyLower = entry.caseSensitive ? key : key.toLowerCase();
    const searchText = entry.caseSensitive ? message : messageLower;
    return searchText.includes(keyLower);
  });
}

/**
 * Simple lorebook matching function with recursive scanning
 *
 * Logic:
 * 1. Filter enabled lorebooks
 * 2. Filter by allowed placeholders (allowUser, allowCharacter)
 * 3. Include constant: true entries always
 * 4. Check if message includes any key from keys (case-insensitive)
 * 5. Recursive scanning: scan matched entries' content for more matches
 * 6. Sort by priority (desc) then insertionOrder (asc)
 * 7. Split by position (before_char, after_char)
 *
 * @param message - The message to match against
 * @param entries - Available lorebook entries
 * @param options - Matching options (allowUser, allowCharacter, recursiveScanning)
 * @returns Matched lorebooks grouped by position
 */
export function matchLorebooksSimple(
  message: string,
  entries: LorebookEntryDocument[],
  options: SimpleLorebookMatchOptions = {}
): SimpleLorebookMatchResult {
  const { allowUser = true, allowCharacter = true, recursiveScanning = true } = options;

  // 1. Filter enabled lorebooks
  let filteredEntries = entries.filter((entry) => entry.enabled);

  // 2. Filter by allowed placeholders
  if (!allowUser || !allowCharacter) {
    filteredEntries = filteredEntries.filter((entry) => {
      const hasUser = containsUserPlaceholder(entry.content);
      const hasChar = containsCharPlaceholder(entry.content);

      // Exclude if contains {{user}} but not allowed
      if (hasUser && !allowUser) return false;
      // Exclude if contains {{char}} but not allowed
      if (hasChar && !allowCharacter) return false;

      return true;
    });
  }

  // Track matched entry IDs to avoid duplicates
  const matchedIds = new Set<string>();
  const allMatched: LorebookEntryDocument[] = [];

  // 3. Always include constant entries
  for (const entry of filteredEntries) {
    if (entry.constant && !matchedIds.has(entry.id)) {
      matchedIds.add(entry.id);
      allMatched.push(entry);
    }
  }

  // 4. Initial matching against the message
  for (const entry of filteredEntries) {
    if (!entry.constant && !matchedIds.has(entry.id) && matchesEntryKeys(message, entry)) {
      matchedIds.add(entry.id);
      allMatched.push(entry);
    }
  }

  // 5. Recursive scanning: scan matched entries' content for more matches
  if (recursiveScanning) {
    let newMatches: LorebookEntryDocument[] = [...allMatched];

    while (newMatches.length > 0) {
      const nextMatches: LorebookEntryDocument[] = [];

      // Scan each newly matched entry's content
      for (const matchedEntry of newMatches) {
        for (const entry of filteredEntries) {
          // Skip if already matched or is constant (already included)
          if (matchedIds.has(entry.id) || entry.constant) continue;

          // Check if the matched entry's content triggers this entry
          if (matchesEntryKeys(matchedEntry.content, entry)) {
            matchedIds.add(entry.id);
            allMatched.push(entry);
            nextMatches.push(entry);
          }
        }
      }

      // Continue with newly found matches
      newMatches = nextMatches;
    }
  }

  // 6. Sort by priority (desc) then insertionOrder (asc)
  const sortedEntries = [...allMatched].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    return a.insertionOrder - b.insertionOrder; // Lower order first
  });

  // 7. Split by position
  const beforeChar = sortedEntries.filter(
    (entry) => entry.position === "before_char"
  );
  const afterChar = sortedEntries.filter(
    (entry) => entry.position === "after_char"
  );

  return {
    beforeChar,
    afterChar,
  };
}

/**
 * Helper to get content from matched entries with optional interpolation
 *
 * @param result - The match result
 * @param position - Which position to get content for
 * @param context - Optional interpolation context for {{user}}/{{char}} replacement
 * @returns Concatenated content string
 */
export function getSimpleLorebookContent(
  result: SimpleLorebookMatchResult,
  position: "before_char" | "after_char",
  context?: LorebookInterpolationContext
): string {
  const entries = position === "before_char" ? result.beforeChar : result.afterChar;
  if (entries.length === 0) return "";

  return entries
    .map((e) => {
      if (context) {
        return interpolateLorebookContent(e.content, context);
      }
      return e.content;
    })
    .join("\n\n");
}
