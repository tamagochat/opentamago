import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { useDatabase } from "./useDatabase";
import type { LorebookEntryDocument } from "../schemas/lorebook";
import type { RxDocument } from "rxdb";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export type LorebookEntryInput = Omit<
  LorebookEntryDocument,
  "id" | "createdAt" | "updatedAt"
>;

export function useLorebookEntries(characterId?: string) {
  const { db } = useDatabase();
  const [entries, setEntries] = useState<LorebookEntryDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to lorebook entries for a specific character
  useEffect(() => {
    if (!db || !characterId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const subscription = db.lorebookEntries
      .find({
        selector: {
          characterId,
        },
        sort: [{ createdAt: "asc" }],
      })
      .$.subscribe((docs: RxDocument<LorebookEntryDocument>[]) => {
        setEntries(docs.map((doc: RxDocument<LorebookEntryDocument>) => toMutable<LorebookEntryDocument>(doc.toJSON())));
        setIsLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [db, characterId]);

  // Create a new lorebook entry
  const createEntry = useCallback(
    async (input: LorebookEntryInput) => {
      if (!db) throw new Error("Database not initialized");

      const now = Date.now();
      const entry: LorebookEntryDocument = {
        ...input,
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
      };

      await db.lorebookEntries.insert(entry);
      return entry;
    },
    [db],
  );

  // Create multiple lorebook entries in bulk
  const createEntries = useCallback(
    async (inputs: LorebookEntryInput[]) => {
      if (!db) throw new Error("Database not initialized");

      const now = Date.now();
      const entries: LorebookEntryDocument[] = inputs.map((input) => ({
        ...input,
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
      }));

      await db.lorebookEntries.bulkInsert(entries);
      return entries;
    },
    [db],
  );

  // Update an existing lorebook entry
  const updateEntry = useCallback(
    async (id: string, updates: Partial<LorebookEntryInput>) => {
      if (!db) throw new Error("Database not initialized");

      const doc = await db.lorebookEntries.findOne(id).exec();
      if (!doc) throw new Error(`Lorebook entry ${id} not found`);

      await doc.update({
        $set: {
          ...updates,
          updatedAt: Date.now(),
        },
      });
    },
    [db],
  );

  // Delete a lorebook entry
  const deleteEntry = useCallback(
    async (id: string) => {
      if (!db) throw new Error("Database not initialized");

      const doc = await db.lorebookEntries.findOne(id).exec();
      if (!doc) throw new Error(`Lorebook entry ${id} not found`);

      await doc.remove();
    },
    [db],
  );

  // Delete all lorebook entries for a character
  const deleteEntriesByCharacter = useCallback(
    async (characterId: string) => {
      if (!db) throw new Error("Database not initialized");

      const docs = await db.lorebookEntries
        .find({
          selector: { characterId },
        })
        .exec();

      await Promise.all(docs.map((doc: RxDocument<LorebookEntryDocument>) => doc.remove()));
    },
    [db],
  );

  // Get a single lorebook entry by ID
  const getEntry = useCallback(
    async (id: string) => {
      if (!db) throw new Error("Database not initialized");

      const doc = await db.lorebookEntries.findOne(id).exec();
      return doc ? doc.toJSON() : null;
    },
    [db],
  );

  // Get all lorebook entries for a character (one-time fetch)
  const getEntriesByCharacter = useCallback(
    async (characterId: string) => {
      if (!db) throw new Error("Database not initialized");

      const docs = await db.lorebookEntries
        .find({
          selector: { characterId },
          sort: [{ createdAt: "asc" }],
        })
        .exec();

      return docs.map((doc: RxDocument<LorebookEntryDocument>) => doc.toJSON());
    },
    [db],
  );

  return {
    entries,
    isLoading,
    createEntry,
    createEntries,
    updateEntry,
    deleteEntry,
    deleteEntriesByCharacter,
    getEntry,
    getEntriesByCharacter,
  };
}
