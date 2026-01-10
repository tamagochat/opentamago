import type { MemoryDocument, MemorySource } from "~/lib/db/schemas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = any;

/**
 * Default maximum number of memory entries per chat
 */
export const DEFAULT_MEMORY_LIMIT = 50;

/**
 * Parameters for adding content to memory
 */
export interface AddToMemoryParams {
  chatId: string;
  characterId: string;
  content: string;
  source: MemorySource;
  sourceId?: string;
}

/**
 * Simple hash function for content deduplication
 * Uses a fast string hash (djb2) for performance
 */
export function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = (hash * 33) ^ content.charCodeAt(i);
  }
  // Convert to unsigned 32-bit integer and then to hex
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Generate a memory ID from chatId and content hash
 */
export function generateMemoryId(chatId: string, contentHash: string): string {
  return `${chatId}_${contentHash}`;
}

/**
 * Add or update a memory entry
 *
 * If content with the same hash exists, updates the updatedAt timestamp.
 * Otherwise, creates a new entry.
 *
 * @param db - RxDB database instance
 * @param params - Memory parameters
 * @returns The created or updated memory document
 */
export async function addToMemory(
  db: AnyDatabase,
  params: AddToMemoryParams
): Promise<MemoryDocument> {
  const { chatId, characterId, content, source, sourceId } = params;
  const now = Date.now();

  // Generate content hash for deduplication
  const contentHash = hashContent(content);
  const id = generateMemoryId(chatId, contentHash);

  // Check if entry already exists
  const collection = db.collections.memories;
  const existing = await collection.findOne(id).exec();

  if (existing) {
    // Update existing entry's timestamp (LRU touch)
    await existing.patch({ updatedAt: now });
    return existing.toJSON() as MemoryDocument;
  }

  // Create new entry
  const newDoc = await collection.insert({
    id,
    chatId,
    characterId,
    content,
    contentHash,
    source,
    sourceId,
    createdAt: now,
    updatedAt: now,
  });

  return newDoc.toJSON() as MemoryDocument;
}

/**
 * Add multiple memory entries in batch
 *
 * @param db - RxDB database instance
 * @param entries - Array of memory parameters
 * @returns Array of created/updated memory documents
 */
export async function addManyToMemory(
  db: AnyDatabase,
  entries: AddToMemoryParams[]
): Promise<MemoryDocument[]> {
  const results: MemoryDocument[] = [];

  for (const entry of entries) {
    const result = await addToMemory(db, entry);
    results.push(result);
  }

  return results;
}

/**
 * Get memories for a chat, ordered by updatedAt (most recent first)
 *
 * @param db - RxDB database instance
 * @param chatId - Chat ID to fetch memories for
 * @param limit - Maximum number of memories to return
 * @returns Array of memory documents, most recent first
 */
export async function getMemory(
  db: AnyDatabase,
  chatId: string,
  limit: number = DEFAULT_MEMORY_LIMIT
): Promise<MemoryDocument[]> {
  const collection = db.collections.memories;

  // Query memories for this chat, sorted by updatedAt descending
  const memories = await collection
    .find({
      selector: { chatId },
      sort: [{ updatedAt: "desc" }],
      limit,
    })
    .exec();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return memories.map((m: any) => m.toJSON() as MemoryDocument);
}

/**
 * Get memory content as a single string, ready for prompt injection
 *
 * Returns content ordered by LRU (most recently accessed first).
 *
 * @param db - RxDB database instance
 * @param chatId - Chat ID
 * @param limit - Maximum memories to include
 * @returns Concatenated memory content string
 */
export async function getMemoryContent(
  db: AnyDatabase,
  chatId: string,
  limit: number = DEFAULT_MEMORY_LIMIT
): Promise<string> {
  const memories = await getMemory(db, chatId, limit);
  return memories.map((m) => m.content).join("\n\n");
}

/**
 * Prune old memories if over the limit
 *
 * Removes the oldest entries (by updatedAt) that exceed maxSize.
 *
 * @param db - RxDB database instance
 * @param chatId - Chat ID
 * @param maxSize - Maximum number of memories to keep
 * @returns Number of pruned entries
 */
export async function pruneMemory(
  db: AnyDatabase,
  chatId: string,
  maxSize: number = DEFAULT_MEMORY_LIMIT
): Promise<number> {
  const collection = db.collections.memories;

  // Get all memories for this chat, sorted by updatedAt ascending (oldest first)
  const allMemories = await collection
    .find({
      selector: { chatId },
      sort: [{ updatedAt: "asc" }],
    })
    .exec();

  const excess = allMemories.length - maxSize;
  if (excess <= 0) {
    return 0;
  }

  // Remove the oldest entries
  const toRemove = allMemories.slice(0, excess);
  for (const doc of toRemove) {
    await doc.remove();
  }

  return excess;
}

/**
 * Clear all memories for a chat
 *
 * @param db - RxDB database instance
 * @param chatId - Chat ID
 * @returns Number of removed entries
 */
export async function clearMemory(
  db: AnyDatabase,
  chatId: string
): Promise<number> {
  const collection = db.collections.memories;

  const memories = await collection
    .find({ selector: { chatId } })
    .exec();

  for (const doc of memories) {
    await doc.remove();
  }

  return memories.length;
}

/**
 * Remove memories from a specific source
 *
 * @param db - RxDB database instance
 * @param chatId - Chat ID
 * @param source - Source to filter by
 * @returns Number of removed entries
 */
export async function clearMemoryBySource(
  db: AnyDatabase,
  chatId: string,
  source: MemorySource
): Promise<number> {
  const collection = db.collections.memories;

  const memories = await collection
    .find({
      selector: { chatId, source },
    })
    .exec();

  for (const doc of memories) {
    await doc.remove();
  }

  return memories.length;
}

/**
 * Touch a memory entry (update its timestamp)
 * Used to mark a memory as recently accessed
 *
 * @param db - RxDB database instance
 * @param id - Memory ID
 * @returns Updated memory or null if not found
 */
export async function touchMemory(
  db: AnyDatabase,
  id: string
): Promise<MemoryDocument | null> {
  const collection = db.collections.memories;
  const doc = await collection.findOne(id).exec();

  if (!doc) {
    return null;
  }

  await doc.patch({ updatedAt: Date.now() });
  return doc.toJSON() as MemoryDocument;
}
