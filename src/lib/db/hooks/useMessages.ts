"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDatabase } from "./useDatabase";
import type { MessageDocument, MessageAttachmentMeta } from "../schemas";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Input for adding an attachment to a message
 */
export interface AddAttachmentInput {
  /** Attachment type */
  type: "image" | "audio";
  /** MIME type (e.g., "image/png", "audio/mpeg") */
  mimeType: string;
  /** The binary data */
  data: Uint8Array;
  /** The prompt used to generate this attachment */
  prompt?: string;
  /** Audio duration in seconds */
  duration?: number;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

/** Default page size for message pagination */
const DEFAULT_PAGE_SIZE = 20;

export function useMessages(chatId: string, pageSize = DEFAULT_PAGE_SIZE) {
  const { db, isLoading: dbLoading } = useDatabase();
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track how many messages we're currently displaying
  const displayLimitRef = useRef(pageSize);
  // Track total message count
  const totalCountRef = useRef(0);

  useEffect(() => {
    if (!db || !chatId) return;

    // Reset display limit when chat changes
    displayLimitRef.current = pageSize;
    setHasMore(false);

    // Subscribe to all messages but only display the latest ones
    const subscription = db.messages
      .find({ selector: { chatId } })
      .sort({ createdAt: "asc" })
      .$
      .subscribe((docs) => {
        const allMessages = docs.map((doc) => toMutable<MessageDocument>(doc.toJSON()));
        totalCountRef.current = allMessages.length;

        // Calculate how many to skip to get the latest messages
        const skip = Math.max(0, allMessages.length - displayLimitRef.current);
        const displayedMessages = allMessages.slice(skip);

        setMessages(displayedMessages);
        setHasMore(skip > 0);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, chatId, pageSize]);

  /**
   * Options for adding a message
   */
  interface AddMessageOptions {
    /** Reasoning/thinking content from LLM (for assistant messages) */
    reasoning?: string;
  }

  const addMessage = useCallback(
    async (
      role: "user" | "assistant" | "system",
      content: string,
      options?: AddMessageOptions
    ) => {
      if (!db || !chatId) return null;

      const now = Date.now();
      const message: MessageDocument = {
        id: uuidv4(),
        chatId,
        role,
        content,
        createdAt: now,
        reasoning: options?.reasoning,
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

  /**
   * Set translated content for a message
   */
  const setTranslation = useCallback(
    async (
      messageId: string,
      displayedContent: string,
      displayedContentLanguage: string
    ) => {
      if (!db) return null;

      const doc = await db.messages.findOne(messageId).exec();
      if (!doc) return null;

      await doc.patch({
        displayedContent,
        displayedContentLanguage,
      });

      return toMutable<MessageDocument>(doc.toJSON());
    },
    [db]
  );

  /**
   * Clear translation from a message
   */
  const clearTranslation = useCallback(
    async (messageId: string) => {
      if (!db) return null;

      const doc = await db.messages.findOne(messageId).exec();
      if (!doc) return null;

      await doc.patch({
        displayedContent: undefined,
        displayedContentLanguage: undefined,
      });

      return toMutable<MessageDocument>(doc.toJSON());
    },
    [db]
  );

  /**
   * Add an attachment (image or audio) to a message
   * Stores binary data as RxDB attachment and metadata in attachmentsMeta
   */
  const addAttachment = useCallback(
    async (messageId: string, input: AddAttachmentInput): Promise<MessageAttachmentMeta | null> => {
      if (!db) return null;

      const doc = await db.messages.findOne(messageId).exec();
      if (!doc) return null;

      const now = Date.now();
      const ext = input.mimeType.split("/")[1] ?? (input.type === "image" ? "png" : "mp3");
      const attachmentId = `${input.type}-${now}.${ext}`;

      // Create metadata
      const meta: MessageAttachmentMeta = {
        id: attachmentId,
        type: input.type,
        mimeType: input.mimeType,
        generatedAt: now,
        prompt: input.prompt,
        duration: input.duration,
        width: input.width,
        height: input.height,
      };

      // Store binary data as RxDB attachment
      // Create a new ArrayBuffer from the Uint8Array to avoid SharedArrayBuffer type issues
      const arrayBuffer = input.data.buffer.slice(input.data.byteOffset, input.data.byteOffset + input.data.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: input.mimeType });
      await doc.putAttachment({
        id: attachmentId,
        data: blob,
        type: input.mimeType,
      });

      // Re-fetch the document after putAttachment() because it updates the revision
      // Without this, the subsequent patch() would fail with a CONFLICT error
      const updatedDoc = await db.messages.findOne(messageId).exec();
      if (!updatedDoc) return null;

      // Update attachmentsMeta array
      const currentMeta = updatedDoc.attachmentsMeta ?? [];
      await updatedDoc.patch({
        attachmentsMeta: [...currentMeta, meta],
      });

      return meta;
    },
    [db]
  );

  /**
   * Get attachment data as a data URL for display
   */
  const getAttachmentDataUrl = useCallback(
    async (messageId: string, attachmentId: string): Promise<string | null> => {
      if (!db) return null;

      const doc = await db.messages.findOne(messageId).exec();
      if (!doc) return null;

      const attachment = doc.getAttachment(attachmentId);
      if (!attachment) return null;

      const data = await attachment.getData();
      const blob = new Blob([data], { type: attachment.type });

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },
    [db]
  );

  /**
   * Get attachment data as a Blob (for audio playback)
   */
  const getAttachmentBlob = useCallback(
    async (messageId: string, attachmentId: string): Promise<Blob | null> => {
      if (!db) return null;

      const doc = await db.messages.findOne(messageId).exec();
      if (!doc) return null;

      const attachment = doc.getAttachment(attachmentId);
      if (!attachment) return null;

      const data = await attachment.getData();
      return new Blob([data], { type: attachment.type });
    },
    [db]
  );

  /**
   * Remove an attachment from a message
   */
  const removeAttachment = useCallback(
    async (messageId: string, attachmentId: string): Promise<boolean> => {
      if (!db) return false;

      const doc = await db.messages.findOne(messageId).exec();
      if (!doc) return false;

      // Remove the RxDB attachment
      const attachment = doc.getAttachment(attachmentId);
      if (attachment) {
        await attachment.remove();
      }

      // Update attachmentsMeta to remove the entry
      const currentMeta = doc.attachmentsMeta ?? [];
      const updatedMeta = currentMeta.filter((m) => m.id !== attachmentId);
      await doc.patch({
        attachmentsMeta: updatedMeta.length > 0 ? updatedMeta : undefined,
      });

      return true;
    },
    [db]
  );

  /**
   * Load more (older) messages by increasing the display limit
   */
  const loadMore = useCallback(async () => {
    if (!db || !chatId || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    // Increase the display limit by another page
    displayLimitRef.current += pageSize;

    // Re-fetch messages with the new limit
    const docs = await db.messages
      .find({ selector: { chatId } })
      .sort({ createdAt: "asc" })
      .exec();

    const allMessages = docs.map((doc) => toMutable<MessageDocument>(doc.toJSON()));
    totalCountRef.current = allMessages.length;

    const skip = Math.max(0, allMessages.length - displayLimitRef.current);
    const displayedMessages = allMessages.slice(skip);

    setMessages(displayedMessages);
    setHasMore(skip > 0);
    setIsLoadingMore(false);
  }, [db, chatId, isLoadingMore, hasMore, pageSize]);

  return {
    messages,
    isLoading: dbLoading || isLoading,
    hasMore,
    isLoadingMore,
    loadMore,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    setTranslation,
    clearTranslation,
    addAttachment,
    getAttachmentDataUrl,
    getAttachmentBlob,
    removeAttachment,
  };
}
