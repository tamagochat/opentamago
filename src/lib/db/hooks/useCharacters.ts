"use client";

import { useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDatabase } from "./useDatabase";
import type { CharacterDocument } from "../schemas";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function useCharacters() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [characters, setCharacters] = useState<CharacterDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const subscription = db.characters
      .find()
      .sort({ updatedAt: "desc" })
      .$
      .subscribe((docs) => {
        setCharacters(docs.map((doc) => toMutable<CharacterDocument>(doc.toJSON())));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db]);

  const createCharacter = useCallback(
    async (data: Omit<CharacterDocument, "id" | "createdAt" | "updatedAt">) => {
      if (!db) {
        console.error("Database not initialized");
        return null;
      }

      try {
        const now = Date.now();
        const character: CharacterDocument = {
          ...data,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };

        console.log("Inserting character:", character);
        await db.characters.insert(character);
        console.log("Character inserted successfully");
        return character;
      } catch (error) {
        console.error("Error inserting character:", error);
        throw error;
      }
    },
    [db]
  );

  const updateCharacter = useCallback(
    async (id: string, data: Partial<CharacterDocument>) => {
      if (!db) return null;

      const doc = await db.characters.findOne(id).exec();
      if (!doc) return null;

      await doc.patch({
        ...data,
        updatedAt: Date.now(),
      });

      return toMutable<CharacterDocument>(doc.toJSON());
    },
    [db]
  );

  const deleteCharacter = useCallback(
    async (id: string) => {
      if (!db) return false;

      const doc = await db.characters.findOne(id).exec();
      if (!doc) return false;

      // Delete associated chats and messages
      const chats = await db.chats.find({ selector: { characterId: id } }).exec();
      for (const chat of chats) {
        await db.messages.find({ selector: { chatId: chat.id } }).remove();
      }
      await db.chats.find({ selector: { characterId: id } }).remove();

      await doc.remove();
      return true;
    },
    [db]
  );

  const getCharacter = useCallback(
    async (id: string) => {
      if (!db) return null;

      const doc = await db.characters.findOne(id).exec();
      return doc ? toMutable<CharacterDocument>(doc.toJSON()) : null;
    },
    [db]
  );

  return {
    characters,
    isLoading: dbLoading || isLoading,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacter,
  };
}
