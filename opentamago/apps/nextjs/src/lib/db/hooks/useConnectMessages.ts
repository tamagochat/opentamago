"use client";

import { useCallback } from "react";
import { useConnectStore } from "~/lib/stores/connect-store";

export interface ConnectMessageDocument {
  id: string;
  sessionId: string;
  messageData: string; // JSON string
  timestamp: number;
  peerId: string;
}

export function useConnectMessages(_sessionId: string | null) {
  const { chatHistory } = useConnectStore();

  // Note: We ignore sessionId since we only store the active session in memory
  // Messages are automatically cleared when session changes

  const saveMessage = useCallback(
    (
      _messageId: string,
      _sessionId: string,
      _messageData: string,
      _peerId: string,
      _timestamp: number
    ) => {
      // Messages are now saved directly to chatHistory via addChatMessage in the store
      // This function is kept for backwards compatibility but is a no-op
      return Promise.resolve(null);
    },
    []
  );

  const loadMessages = useCallback(
    (_sessionId: string) => {
      // Return empty array since messages are now accessed via chatHistory
      return Promise.resolve([]);
    },
    []
  );

  const clearMessages = useCallback(
    (_sessionId: string) => {
      // Messages are cleared automatically when session is cleared
      return Promise.resolve(true);
    },
    []
  );

  // Convert chatHistory to ConnectMessageDocument format for compatibility
  const messages: ConnectMessageDocument[] = chatHistory.map((msg) => ({
    id: msg.id,
    sessionId: "", // Not tracked in memory
    messageData: JSON.stringify(msg),
    timestamp: msg.timestamp,
    peerId: msg.type === "ChatMessage" ? msg.senderId : "",
  }));

  return {
    messages,
    isLoading: false,
    saveMessage,
    loadMessages,
    clearMessages,
  };
}
