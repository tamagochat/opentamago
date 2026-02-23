"use client";

import { useEffect, useState, useCallback } from "react";
import { useDatabase } from "../database-provider";
import type { MemoryDocument, LorebookEntryDocument } from "../schemas";
import type { RxDocument } from "rxdb";
import {
  addToMemory,
  getMemory,
  getMemoryContent,
  pruneMemory,
  clearMemory,
  DEFAULT_MEMORY_LIMIT,
} from "~/lib/chat/lru-memory";
import { updateMemoryFromLorebook } from "~/lib/chat/lorebook-memory";
import type { LorebookInterpolationContext } from "~/lib/chat/simple-lorebook-matcher";

/**
 * Hook to fetch and subscribe to memories for a chat (LRU ordered)
 *
 * Memories are ordered by updatedAt (most recently accessed first).
 */
export function useMemories(chatId: string, limit = DEFAULT_MEMORY_LIMIT) {
  const { db } = useDatabase();
  const [memories, setMemories] = useState<RxDocument<MemoryDocument>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !chatId) return;

    setIsLoading(true);

    // Query memories for this chat, sorted by LRU (updatedAt desc)
    const query = db.memories.find({
      selector: { chatId },
      sort: [{ updatedAt: "desc" }],
      limit,
    });

    // Subscribe to changes
    const subscription = query.$.subscribe({
      next: (results: RxDocument<MemoryDocument>[]) => {
        setMemories(results);
        setIsLoading(false);
      },
      error: (error: Error) => {
        console.error("Error fetching memories:", error);
        setIsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [db, chatId, limit]);

  return { memories, isLoading };
}

/**
 * Hook for LRU memory operations
 *
 * Provides functions to:
 * - Add content to memory (with deduplication)
 * - Get memory content as string
 * - Update memory from lorebook matches
 * - Clear and prune memory
 */
export function useLRUMemory(chatId: string, characterId: string) {
  const { db } = useDatabase();

  /**
   * Add content to memory. If same content exists, updates timestamp.
   */
  const addContent = useCallback(
    async (content: string, source: "lorebook" | "manual" | "system" = "manual", sourceId?: string) => {
      if (!db) throw new Error("Database not initialized");

      return await addToMemory(db, {
        chatId,
        characterId,
        content,
        source,
        sourceId,
      });
    },
    [db, chatId, characterId]
  );

  /**
   * Get all memory content as a single string (for prompt injection)
   */
  const getContent = useCallback(
    async (limit = DEFAULT_MEMORY_LIMIT): Promise<string> => {
      if (!db) return "";
      return await getMemoryContent(db, chatId, limit);
    },
    [db, chatId]
  );

  /**
   * Get memory documents
   */
  const getMemories = useCallback(
    async (limit = DEFAULT_MEMORY_LIMIT): Promise<MemoryDocument[]> => {
      if (!db) return [];
      return await getMemory(db, chatId, limit);
    },
    [db, chatId]
  );

  /**
   * Update memory from lorebook matches
   *
   * Call this before sending a user message or after receiving an assistant message.
   *
   * @param message - Message to match against lorebook keys
   * @param lorebookEntries - Available lorebook entries
   * @param interpolationContext - Context for {{user}}/{{char}} replacement
   * @param options - Optional settings (maxMemorySize, allowUser, allowCharacter, recursiveScanning)
   */
  const updateFromLorebook = useCallback(
    async (
      message: string,
      lorebookEntries: LorebookEntryDocument[],
      interpolationContext: LorebookInterpolationContext,
      options?: {
        maxMemorySize?: number;
        /** Allow entries with {{user}} - default true, set false for group chats */
        allowUser?: boolean;
        /** Allow entries with {{char}} - default true */
        allowCharacter?: boolean;
        /** Enable recursive scanning of matched content - default true */
        recursiveScanning?: boolean;
      }
    ) => {
      if (!db) throw new Error("Database not initialized");

      const {
        maxMemorySize = DEFAULT_MEMORY_LIMIT,
        allowUser = true,
        allowCharacter = true,
        recursiveScanning = true,
      } = options ?? {};

      return await updateMemoryFromLorebook(db, {
        message,
        lorebookEntries,
        chatId,
        characterId,
        interpolationContext,
        maxMemorySize,
        allowUser,
        allowCharacter,
        recursiveScanning,
      });
    },
    [db, chatId, characterId]
  );

  /**
   * Prune old memories if over limit
   */
  const prune = useCallback(
    async (maxSize = DEFAULT_MEMORY_LIMIT): Promise<number> => {
      if (!db) return 0;
      return await pruneMemory(db, chatId, maxSize);
    },
    [db, chatId]
  );

  /**
   * Clear all memories for this chat
   */
  const clear = useCallback(async (): Promise<number> => {
    if (!db) return 0;
    return await clearMemory(db, chatId);
  }, [db, chatId]);

  return {
    addContent,
    getContent,
    getMemories,
    updateFromLorebook,
    prune,
    clear,
  };
}

/**
 * Hook to delete a specific memory
 */
export function useDeleteMemory() {
  const { db } = useDatabase();

  const deleteMemory = async (memoryId: string) => {
    if (!db) throw new Error("Database not initialized");

    const memory = await db.memories.findOne(memoryId).exec();
    if (memory) {
      await memory.remove();
    }
  };

  return { deleteMemory };
}

/**
 * Get formatted memory strings for prompt context
 */
export function formatMemoriesForPrompt(memories: RxDocument<MemoryDocument>[]): string {
  return memories.map((m) => m.content).join("\n\n");
}
