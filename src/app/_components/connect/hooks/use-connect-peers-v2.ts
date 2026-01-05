"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useConnectManager } from "~/app/_components/p2p/connect-manager-provider";
import { useConnectStore } from "~/lib/stores/connect-store";
import { useConnectSession, useConnectMessages } from "~/lib/db/hooks";
import type { CharacterData, ChatMessageType } from "~/lib/connect/messages";
import type { Participant, ChatItemType } from "./use-connect-peers";

interface UseConnectPeersOptions {
  isHost: boolean;
  hostPeerId: string | null;
  myCharacter: CharacterData | null;
  onMessage?: (message: ChatMessageType) => void;
  onParticipantJoined?: (participant: Participant) => void;
  onParticipantLeft?: (peerId: string) => void;
  onTyping?: (peerId: string, isTyping: boolean) => void;
  onThinking?: (peerId: string, isThinking: boolean, timestamp: number) => void;
}

export function useConnectPeersV2({
  isHost,
  hostPeerId,
  myCharacter,
  onMessage,
  onParticipantJoined,
  onParticipantLeft,
  onTyping,
  onThinking,
}: UseConnectPeersOptions) {
  const { manager } = useConnectManager();
  const store = useConnectStore();
  const { session, saveSession, clearSession: clearRxSession } = useConnectSession();
  const { messages: persistedMessages, saveMessage } = useConnectMessages(
    session?.sessionId ?? null
  );

  const [isConnected, setIsConnected] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatItemType[]>([]);

  const myPeerIdRef = useRef(store.sessionInfo?.myPeerId);
  const myCharacterRef = useRef(myCharacter);

  // Keep refs in sync
  useEffect(() => {
    myPeerIdRef.current = store.sessionInfo?.myPeerId;
  }, [store.sessionInfo?.myPeerId]);

  useEffect(() => {
    myCharacterRef.current = myCharacter;
  }, [myCharacter]);

  // Initialize manager when session starts
  useEffect(() => {
    if (!manager || !myCharacter || !store.sessionInfo?.myPeerId) return;

    setIsConnected(true);
  }, [manager, myCharacter, store.sessionInfo?.myPeerId]);

  // Merge buffered messages with chat history
  useEffect(() => {
    const buffered = store.bufferedMessages;
    if (buffered.length > 0) {
      setChatHistory((prev) => {
        const merged = [...prev, ...buffered];
        // Deduplicate by message ID
        const seen = new Set<string>();
        return merged.filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }).sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  }, [store.bufferedMessages]);

  // Load persisted messages on mount
  useEffect(() => {
    if (persistedMessages.length > 0) {
      const chatItems = persistedMessages.map((msg) => {
        return JSON.parse(msg.messageData) as ChatItemType;
      });
      setChatHistory(chatItems);
    }
  }, [persistedMessages]);

  // Send chat message
  const sendChatMessage = useCallback(
    (content: string, isHuman: boolean) => {
      if (!manager || !myCharacterRef.current || !myPeerIdRef.current) return;

      const chatMsg: ChatMessageType = {
        type: "ChatMessage",
        id: crypto.randomUUID(),
        senderId: myPeerIdRef.current,
        characterName: myCharacterRef.current.name,
        content,
        isHuman,
        timestamp: Date.now(),
      };

      // Add to local history
      setChatHistory((prev) => [...prev, chatMsg]);

      // Broadcast to peers
      manager.broadcast(chatMsg);

      // Persist to RxDB
      if (session?.sessionId) {
        void saveMessage(
          chatMsg.id,
          session.sessionId,
          JSON.stringify(chatMsg),
          myPeerIdRef.current,
          chatMsg.timestamp
        );
      }
    },
    [manager, session?.sessionId, saveMessage]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!manager || !myCharacterRef.current || !myPeerIdRef.current) return;

      manager.broadcast({
        type: "Typing",
        peerId: myPeerIdRef.current,
        characterName: myCharacterRef.current.name,
        isTyping,
      });
    },
    [manager]
  );

  // Send thinking indicator
  const sendThinking = useCallback(
    (isThinking: boolean) => {
      if (!manager || !myCharacterRef.current || !myPeerIdRef.current) return;

      manager.broadcast({
        type: "Thinking",
        peerId: myPeerIdRef.current,
        characterName: myCharacterRef.current.name,
        isThinking,
      });
    },
    [manager]
  );

  // Toggle auto-reply
  const toggleAutoReply = useCallback(
    (enabled: boolean) => {
      setAutoReplyEnabled(enabled);

      if (manager && myPeerIdRef.current) {
        manager.broadcast({
          type: "PeerState",
          peerId: myPeerIdRef.current,
          autoReplyEnabled: enabled,
        });
      }
    },
    [manager]
  );

  // Disconnect all
  const disconnectAll = useCallback(() => {
    if (manager) {
      manager.disconnectAll();
    }
    setIsConnected(false);
    void clearRxSession();
  }, [manager, clearRxSession]);

  // Connect to peer
  const connectToPeer = useCallback(
    (peerId: string) => {
      if (manager) {
        manager.connectToPeer(peerId);
      }
    },
    [manager]
  );

  // Convert participants map to array
  const participantsArray = Array.from(store.participants.values());
  const thinkingPeersArray = Array.from(store.thinkingPeers);

  return {
    participants: participantsArray,
    isConnected,
    autoReplyEnabled,
    chatHistory,
    thinkingPeers: thinkingPeersArray,
    sendChatMessage,
    sendTyping,
    sendThinking,
    toggleAutoReply,
    disconnectAll,
    connectToPeer,
  };
}
