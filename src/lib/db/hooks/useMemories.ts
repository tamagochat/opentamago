"use client";

import { useEffect, useState } from "react";
import { useDatabase } from "../database-provider";
import type { MemoryDocument } from "../schemas";
import type { RxDocument } from "rxdb";

/**
 * Hook to fetch and subscribe to memories for a chat
 */
export function useMemories(chatId: string, limit = 10) {
  const { db } = useDatabase();
  const [memories, setMemories] = useState<RxDocument<MemoryDocument>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    setIsLoading(true);

    // Query memories for this chat, sorted by recency
    const query = db.memories
      .find({
        selector: { chatId },
        sort: [{ createdAt: "desc" }],
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
 * Hook to create a new memory
 */
export function useCreateMemory() {
  const { db } = useDatabase();

  const createMemory = async (memory: Omit<MemoryDocument, "id" | "createdAt">) => {
    if (!db) throw new Error("Database not initialized");

    return await db.memories.insert({
      id: crypto.randomUUID(),
      ...memory,
      createdAt: Date.now(),
    });
  };

  return { createMemory };
}

/**
 * Hook to delete memories
 */
export function useDeleteMemory() {
  const { db } = useDatabase();

  const deleteMemory = async (memoryId: string) => {
    if (!db) throw new Error("Database not initialized");

    const memory = await db.memories.findOne({ selector: { id: memoryId } }).exec();
    if (memory) {
      await memory.remove();
    }
  };

  return { deleteMemory };
}

/**
 * Get formatted memory strings for prompt context
 */
export function formatMemoriesForPrompt(memories: RxDocument<MemoryDocument>[]): string[] {
  return memories.map((m) => m.content);
}
