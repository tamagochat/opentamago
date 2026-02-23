"use client";

import { useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDatabase } from "./useDatabase";
import type { CollectionDocument } from "../schemas";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// Default colors for new collections
export const COLLECTION_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#22c55e", // green
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#ef4444", // red
] as const;

// Default icons for collections
export const COLLECTION_ICONS = [
  "folder",
  "star",
  "heart",
  "bookmark",
  "flag",
  "tag",
  "crown",
  "sparkles",
  "flame",
  "zap",
] as const;

export function useCollections() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [collections, setCollections] = useState<CollectionDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const subscription = db.characterCollections
      .find()
      .sort({ order: "asc" })
      .$
      .subscribe((docs) => {
        setCollections(docs.map((doc) => toMutable<CollectionDocument>(doc.toJSON())));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db]);

  const createCollection = useCallback(
    async (data: Omit<CollectionDocument, "id" | "createdAt" | "updatedAt" | "order">) => {
      if (!db) {
        console.error("Database not initialized");
        return null;
      }

      try {
        const now = Date.now();
        // Get next order value (max order + 1, or 0 if no collections)
        const maxOrder = collections.length > 0
          ? Math.max(...collections.map((c) => c.order))
          : -1;

        const collection: CollectionDocument = {
          ...data,
          id: uuidv4(),
          order: maxOrder + 1,
          createdAt: now,
          updatedAt: now,
        };

        await db.characterCollections.insert(collection);
        return collection;
      } catch (error) {
        console.error("Error creating collection:", error);
        throw error;
      }
    },
    [db, collections]
  );

  const updateCollection = useCallback(
    async (id: string, data: Partial<Omit<CollectionDocument, "id" | "createdAt">>) => {
      if (!db) return null;

      const doc = await db.characterCollections.findOne(id).exec();
      if (!doc) return null;

      await doc.patch({
        ...data,
        updatedAt: Date.now(),
      });

      return toMutable<CollectionDocument>(doc.toJSON());
    },
    [db]
  );

  const deleteCollection = useCallback(
    async (id: string, reassignCharactersToCollectionId?: string) => {
      if (!db) return false;

      const doc = await db.characterCollections.findOne(id).exec();
      if (!doc) return false;

      // Reassign or clear collectionId for all characters in this collection
      const charactersInCollection = await db.characters
        .find({ selector: { collectionId: id } })
        .exec();

      for (const character of charactersInCollection) {
        await character.patch({
          collectionId: reassignCharactersToCollectionId ?? undefined,
          updatedAt: Date.now(),
        });
      }

      await doc.remove();
      return true;
    },
    [db]
  );

  const getCollection = useCallback(
    async (id: string) => {
      if (!db) return null;

      const doc = await db.characterCollections.findOne(id).exec();
      return doc ? toMutable<CollectionDocument>(doc.toJSON()) : null;
    },
    [db]
  );

  const reorderCollections = useCallback(
    async (orderedIds: string[]) => {
      if (!db) return false;

      try {
        const now = Date.now();
        for (let i = 0; i < orderedIds.length; i++) {
          const doc = await db.characterCollections.findOne(orderedIds[i]).exec();
          if (doc) {
            await doc.patch({
              order: i,
              updatedAt: now,
            });
          }
        }
        return true;
      } catch (error) {
        console.error("Error reordering collections:", error);
        return false;
      }
    },
    [db]
  );

  const getCharacterCountByCollection = useCallback(
    async (collectionId: string) => {
      if (!db) return 0;

      const characters = await db.characters
        .find({ selector: { collectionId } })
        .exec();
      return characters.length;
    },
    [db]
  );

  const getUncategorizedCount = useCallback(async () => {
    if (!db) return 0;

    // Characters without a collectionId or with collectionId that doesn't exist
    const allCharacters = await db.characters.find().exec();
    const collectionIds = new Set(collections.map((c) => c.id));

    return allCharacters.filter(
      (c) => !c.collectionId || !collectionIds.has(c.collectionId)
    ).length;
  }, [db, collections]);

  return {
    collections,
    isLoading: dbLoading || isLoading,
    createCollection,
    updateCollection,
    deleteCollection,
    getCollection,
    reorderCollections,
    getCharacterCountByCollection,
    getUncategorizedCount,
  };
}
