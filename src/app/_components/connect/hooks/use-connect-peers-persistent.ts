"use client";

import { useEffect, useCallback, useRef } from "react";
import { useConnectPeers } from "./use-connect-peers";
import type { Participant, ChatItemType } from "./use-connect-peers";
import type { CharacterData, ChatMessageType } from "~/lib/connect/messages";
import { useConnectSession, useConnectMessages } from "~/lib/db/hooks";
import {
  setSession,
  clearSession as clearStoreSession,
  setParticipants,
  attachComponent,
  detachComponent,
  clearBufferedMessages,
  type ConnectSessionInfo,
} from "~/lib/stores/connect-store";

interface UseConnectPeersPersistentOptions {
  isHost: boolean;
  hostPeerId: string | null;
  myCharacter: CharacterData | null;
  sessionId?: string;
  slug?: string;
  onMessage?: (message: ChatMessageType) => void;
  onParticipantJoined?: (participant: Participant) => void;
  onParticipantLeft?: (peerId: string) => void;
  onTyping?: (peerId: string, isTyping: boolean) => void;
  onThinking?: (peerId: string, isThinking: boolean, timestamp: number) => void;
}

/**
 * Enhanced version of useConnectPeers that adds persistence via RxDB and global store
 */
export function useConnectPeersPersistent(options: UseConnectPeersPersistentOptions) {
  const {
    isHost,
    hostPeerId,
    myCharacter,
    sessionId,
    slug,
    ...callbackOptions
  } = options;

  // Use the original hook with sessionId for state isolation
  const hookResult = useConnectPeers({
    isHost,
    hostPeerId,
    myCharacter,
    sessionId,
    ...callbackOptions,
  });

  const { saveSession, updateSession, clearSession: clearRxSession } =
    useConnectSession();
  const { saveMessage } = useConnectMessages(sessionId ?? null);

  const myPeerId = hostPeerId; // For host, this is the peer ID
  const hasInitializedRef = useRef(false);

  // Initialize session in store and RxDB when session starts
  useEffect(() => {
    if (
      !hasInitializedRef.current &&
      myPeerId &&
      myCharacter &&
      sessionId &&
      slug &&
      hostPeerId
    ) {
      hasInitializedRef.current = true;

      // Save to global store
      const sessionInfo: ConnectSessionInfo = {
        sessionId,
        slug,
        hostPeerId,
        isHost,
        myPeerId,
        myCharacter,
      };
      setSession(sessionInfo);

      // Save to RxDB
      void saveSession({
        sessionId,
        slug,
        hostPeerId,
        isHost,
        myPeerId,
        myCharacter,
        participants: JSON.stringify([]),
      });

      // Mark component as attached
      attachComponent();
    }
  }, [
    myPeerId,
    myCharacter,
    sessionId,
    slug,
    hostPeerId,
    isHost,
    saveSession,
  ]);

  // Sync participants to store
  useEffect(() => {
    const participantsMap = new Map(
      hookResult.participants.map((p) => [p.peerId, p])
    );
    setParticipants(participantsMap);

    // Also save to RxDB (exclude connection property to avoid circular references)
    if (sessionId) {
      const serializableParticipants = hookResult.participants.map(
        ({ connection, ...rest }) => rest
      );
      void updateSession({
        participants: JSON.stringify(serializableParticipants),
      });
    }
  }, [hookResult.participants, sessionId, updateSession]);

  // Save chat messages to RxDB
  const prevMessagesLengthRef = useRef(0);
  useEffect(() => {
    const newMessages = hookResult.chatHistory.slice(
      prevMessagesLengthRef.current
    );
    prevMessagesLengthRef.current = hookResult.chatHistory.length;

    if (newMessages.length > 0 && sessionId && myPeerId) {
      newMessages.forEach((msg) => {
        void saveMessage(
          msg.id,
          sessionId,
          JSON.stringify(msg),
          msg.type === "ChatMessage" ? msg.senderId : myPeerId,
          msg.timestamp
        );
      });
    }
  }, [hookResult.chatHistory, sessionId, myPeerId, saveMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Mark component as detached (but keep session alive)
      detachComponent();
    };
  }, []);

  // Enhanced disconnect that clears all state
  const disconnectAll = useCallback(() => {
    hookResult.disconnectAll();
    clearStoreSession();
    clearBufferedMessages();
    void clearRxSession();
    hasInitializedRef.current = false;
  }, [hookResult, clearRxSession]);

  return {
    ...hookResult,
    disconnectAll,
  };
}
