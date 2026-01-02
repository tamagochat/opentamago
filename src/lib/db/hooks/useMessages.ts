"use client";

import { useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDatabase } from "./useDatabase";
import type { MessageDocument } from "../schemas";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function useMessages(chatId: string) {
  const { db, isLoading: dbLoading } = useDatabase();
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !chatId) return;

    const subscription = db.messages
      .find({ selector: { chatId } })
      .sort({ createdAt: "asc" })
      .$
      .subscribe((docs) => {
        setMessages(docs.map((doc) => toMutable<MessageDocument>(doc.toJSON())));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, chatId]);

  const addMessage = useCallback(
    async (role: "user" | "assistant" | "system", content: string) => {
      if (!db || !chatId) return null;

      const now = Date.now();
      const message: MessageDocument = {
        id: uuidv4(),
        chatId,
        role,
        content,
        createdAt: now,
      };

      await db.messages.insert(message);

      // Update chat's lastMessageAt
      const chatDoc = await db.chats.findOne(chatId).exec();
      if (chatDoc) {
        await chatDoc.patch({ lastMessageAt: now, updatedAt: now });
      }

      return message;
    },
    [db, chatId]
  );

  const updateMessage = useCallback(
    async (id: string, content: string) => {
      if (!db) return null;

      const doc = await db.messages.findOne(id).exec();
      if (!doc) return null;

      await doc.patch({
        content,
        editedAt: Date.now(),
      });

      return toMutable<MessageDocument>(doc.toJSON());
    },
    [db]
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      if (!db) return false;

      const doc = await db.messages.findOne(id).exec();
      if (!doc) return false;

      await doc.remove();
      return true;
    },
    [db]
  );

  const clearMessages = useCallback(async () => {
    if (!db || !chatId) return false;

    await db.messages.find({ selector: { chatId } }).remove();
    return true;
  }, [db, chatId]);

  return {
    messages,
    isLoading: dbLoading || isLoading,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
  };
}
