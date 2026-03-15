"use client";

import { useCallback, useRef, useEffect } from "react";
import {
  useConnectStore,
  type ConnectSessionInfo,
} from "~/lib/stores/connect-store";
import type { CharacterData } from "~/lib/connect/messages";

export interface ConnectSessionDocument extends ConnectSessionInfo {
  id: string;
  participants: string; // JSON string
  createdAt: number;
  updatedAt: number;
}

export function useConnectSession() {
  const {
    sessionInfo,
    setSession,
    clearSession: clearStoreSession,
    updateSessionInfo,
  } = useConnectStore();

  // Use ref to avoid recreating callbacks when sessionInfo changes
  const sessionInfoRef = useRef(sessionInfo);
  useEffect(() => {
    sessionInfoRef.current = sessionInfo;
  }, [sessionInfo]);

  const saveSession = useCallback(
    (data: {
      sessionId: string;
      slug: string;
      hostPeerId: string;
      isHost: boolean;
      myPeerId: string;
      myCharacter: CharacterData;
      participants: string;
    }) => {
      const now = Date.now();
      setSession({
        sessionId: data.sessionId,
        slug: data.slug,
        hostPeerId: data.hostPeerId,
        isHost: data.isHost,
        myPeerId: data.myPeerId,
        myCharacter: data.myCharacter,
        wasInChat: false,
        createdAt: now,
        updatedAt: now,
      });
      return Promise.resolve({
        id: "active",
        ...data,
        wasInChat: false,
        createdAt: now,
        updatedAt: now,
      } as ConnectSessionDocument);
    },
    [setSession]
  );

  const updateSession = useCallback(
    (data: Partial<Omit<ConnectSessionDocument, "id">>) => {
      updateSessionInfo(data);
      const currentSessionInfo = sessionInfoRef.current;
      return Promise.resolve(
        currentSessionInfo
          ? ({
              id: "active",
              ...currentSessionInfo,
              ...data,
              updatedAt: Date.now(),
            } as ConnectSessionDocument)
          : null
      );
    },
    [updateSessionInfo]
  );

  const updateWasInChat = useCallback(
    (wasInChat: boolean) => {
      updateSessionInfo({ wasInChat });
      const currentSessionInfo = sessionInfoRef.current;
      return Promise.resolve(
        currentSessionInfo
          ? ({
              id: "active",
              ...currentSessionInfo,
              wasInChat,
              updatedAt: Date.now(),
            } as ConnectSessionDocument)
          : null
      );
    },
    [updateSessionInfo]
  );

  const clearSession = useCallback(() => {
    clearStoreSession();
    return Promise.resolve(true);
  }, [clearStoreSession]);

  // Convert sessionInfo to ConnectSessionDocument format
  const session: ConnectSessionDocument | null = sessionInfo
    ? {
        id: "active",
        participants: "[]", // Empty as we store participants separately now
        ...sessionInfo,
        createdAt: sessionInfo.createdAt ?? Date.now(),
        updatedAt: sessionInfo.updatedAt ?? Date.now(),
      }
    : null;

  return {
    session,
    isLoading: false,
    saveSession,
    updateSession,
    updateWasInChat,
    clearSession,
  };
}
