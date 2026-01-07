import type { LorebookEntryDocument } from "~/lib/db/schemas";

/**
 * Match result containing entry and match score
 */
export interface LorebookMatch {
  entry: LorebookEntryDocument;
  matchScore: number;
  matchedKeys: string[];
}

/**
 * Options for lorebook matching
 */
export interface LorebookMatchOptions {
  /** Number of top matches to return */
  limit?: number;
  /** Whether to include constant entries regardless of matching */
  includeConstant?: boolean;
  /** Minimum match score required (0-1) */
  minScore?: number;
}

/**
 * Matches lorebook entries against a message and returns top N matches
 *
 * Matching logic:
 * 1. Constant entries are always included (if enabled)
 * 2. Keyword matching (case-sensitive or insensitive based on entry settings)
 * 3. Regex matching (if useRegex is true)
 * 4. Selective matching (requires both primary and secondary keys)
 * 5. Results sorted by: priority (desc) → matchScore (desc) → insertionOrder (asc)
 *
 * @param message - The message content to match against
 * @param entries - Available lorebook entries
 * @param options - Matching options
 * @returns Array of matched lorebook entries, sorted and limited
 */
export function matchLorebooks(
  message: string,
  entries: LorebookEntryDocument[],
  options: LorebookMatchOptions = {}
): LorebookMatch[] {
  const { limit = 3, includeConstant = true, minScore = 0 } = options;

  const matches: LorebookMatch[] = [];

  for (const entry of entries) {
    // Skip disabled entries
    if (!entry.enabled) continue;

    // Always include constant entries if enabled
    if (entry.constant && includeConstant) {
      matches.push({
        entry,
        matchScore: 1.0,
        matchedKeys: ["[constant]"],
      });
      continue;
    }

    // Skip constant entries if we're doing keyword matching
    if (entry.constant) continue;

    // Perform matching
    const matchResult = matchEntry(message, entry);

    if (matchResult.matched && matchResult.score >= minScore) {
      matches.push({
        entry,
        matchScore: matchResult.score,
        matchedKeys: matchResult.matchedKeys,
      });
    }
  }

  // Sort by priority (desc), then match score (desc), then insertion order (asc)
  matches.sort((a, b) => {
    if (a.entry.priority !== b.entry.priority) {
      return b.entry.priority - a.entry.priority;
    }
    if (a.matchScore !== b.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return a.entry.insertionOrder - b.entry.insertionOrder;
  });

  // Return top N matches
  return matches.slice(0, limit);
}

/**
 * Internal function to match a single entry against message
 */
function matchEntry(
  message: string,
  entry: LorebookEntryDocument
): { matched: boolean; score: number; matchedKeys: string[] } {
  const matchedKeys: string[] = [];
  let primaryMatched = false;
  let secondaryMatched = false;

  // Prepare message for matching
  const searchText = entry.caseSensitive ? message : message.toLowerCase();

  // Match primary keys
  for (const key of entry.keys) {
    if (matchKey(searchText, key, entry)) {
      primaryMatched = true;
      matchedKeys.push(key);
    }
  }

  // Match secondary keys (if selective mode)
  if (entry.selective && entry.secondaryKeys.length > 0) {
    for (const key of entry.secondaryKeys) {
      if (matchKey(searchText, key, entry)) {
        secondaryMatched = true;
        matchedKeys.push(key);
      }
    }
  }

  // Determine if entry matches
  let matched = false;
  if (entry.selective) {
    // Selective mode: requires both primary and secondary key match
    matched = primaryMatched && secondaryMatched;
  } else {
    // Normal mode: any primary key match
    matched = primaryMatched;
  }

  // Calculate match score (0-1)
  const score = matched ? calculateMatchScore(matchedKeys.length, entry) : 0;

  return { matched, score, matchedKeys };
}

/**
 * Match a single key against the message
 */
function matchKey(
  searchText: string,
  key: string,
  entry: LorebookEntryDocument
): boolean {
  if (!key || key.trim().length === 0) return false;

  if (entry.useRegex) {
    // Regex matching
    try {
      const flags = entry.caseSensitive ? "g" : "gi";
      const regex = new RegExp(key, flags);
      return regex.test(searchText);
    } catch (error) {
      console.warn(`Invalid regex pattern in lorebook entry: ${key}`, error);
      return false;
    }
  } else {
    // Simple keyword matching
    const searchKey = entry.caseSensitive ? key : key.toLowerCase();
    return searchText.includes(searchKey);
  }
}

/**
 * Calculate match score based on number of matched keys
 * More matched keys = higher score
 */
function calculateMatchScore(
  matchedCount: number,
  entry: LorebookEntryDocument
): number {
  const totalKeys = entry.keys.length + entry.secondaryKeys.length;
  if (totalKeys === 0) return 0;

  // Base score from match ratio
  const matchRatio = matchedCount / totalKeys;

  // Boost score slightly for selective entries (they're more specific)
  const selectiveBoost = entry.selective ? 0.1 : 0;

  return Math.min(1.0, matchRatio + selectiveBoost);
}

/**
 * Helper to get matched lorebook content strings for injection
 */
export function getLorebookContent(matches: LorebookMatch[]): string[] {
  return matches.map((match) => match.entry.content);
}

/**
 * Helper to format lorebook entries for system prompt injection
 */
export function formatLorebooksForPrompt(
  matches: LorebookMatch[],
  position: "before_char" | "after_char" = "before_char"
): string {
  const filtered = matches.filter((m) => m.entry.position === position);

  if (filtered.length === 0) return "";

  const contents = filtered.map((match) => match.entry.content);
  return contents.join("\n\n");
}
