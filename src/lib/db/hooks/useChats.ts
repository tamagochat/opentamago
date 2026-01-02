"use client";

import { useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDatabase } from "./useDatabase";
import type { ChatDocument } from "../schemas";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function useChats(characterId?: string) {
  const { db, isLoading: dbLoading } = useDatabase();
  const [chats, setChats] = useState<ChatDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const selector = characterId ? { characterId } : {};
    const subscription = db.chats
      .find({ selector })
      .sort({ lastMessageAt: "desc" })
      .$
      .subscribe((docs) => {
        setChats(docs.map((doc) => toMutable<ChatDocument>(doc.toJSON())));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, characterId]);

  const createChat = useCallback(
    async (characterId: string, title?: string) => {
      if (!db) return null;

      const now = Date.now();
      const chat: ChatDocument = {
        id: uuidv4(),
        characterId,
        title: title ?? "New Chat",
        createdAt: now,
        updatedAt: now,
        lastMessageAt: now,
      };

      await db.chats.insert(chat);
      return chat;
    },
    [db]
  );

  const updateChat = useCallback(
    async (id: string, data: Partial<ChatDocument>) => {
      if (!db) return null;

      const doc = await db.chats.findOne(id).exec();
      if (!doc) return null;

      await doc.patch({
        ...data,
        updatedAt: Date.now(),
      });

      return toMutable<ChatDocument>(doc.toJSON());
    },
    [db]
  );

  const deleteChat = useCallback(
    async (id: string) => {
      if (!db) return false;

      const doc = await db.chats.findOne(id).exec();
      if (!doc) return false;

      // Delete associated messages
      await db.messages.find({ selector: { chatId: id } }).remove();
      await doc.remove();
      return true;
    },
    [db]
  );

  const getChat = useCallback(
    async (id: string) => {
      if (!db) return null;

      const doc = await db.chats.findOne(id).exec();
      return doc ? toMutable<ChatDocument>(doc.toJSON()) : null;
    },
    [db]
  );

  return {
    chats,
    isLoading: dbLoading || isLoading,
    createChat,
    updateChat,
    deleteChat,
    getChat,
  };
}
