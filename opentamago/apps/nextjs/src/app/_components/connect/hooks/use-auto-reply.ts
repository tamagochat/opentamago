"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CharacterData, ChatMessageType } from "~/lib/connect/messages";
import { CONNECT_CONFIG } from "~/lib/connect";
import { createGroupChatContext, generateResponse as generateAIResponse } from "~/lib/chat";
import type { ChatBubbleTheme } from "~/lib/db/schemas/settings";
import type { ProviderSettingsDocument } from "~/lib/db/schemas";
import type { LLMProvider } from "~/lib/ai";

// Debounce window - cancel if other events happen within this time
const DEBOUNCE_WINDOW_MS = 5000;

interface UseAutoReplyOptions {
  myPeerId: string | null;
  myCharacter: CharacterData | null;
  enabled: boolean;
  delayMs?: number;
  providerId: LLMProvider;
  providerSettings: ProviderSettingsDocument | undefined;
  isApiReady?: boolean;
  model?: string;
  temperature?: number;
  theme?: ChatBubbleTheme;
  onResponse?: (content: string) => void;
}

export function useAutoReply({
  myPeerId,
  myCharacter,
  enabled,
  delayMs = CONNECT_CONFIG.DEFAULT_AUTO_REPLY_DELAY,
  providerId,
  providerSettings,
  isApiReady = true,
  model = "gemini-3-flash-preview",
  temperature = 0.9,
  theme = "messenger",
  onResponse,
}: UseAutoReplyOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTimestampRef = useRef<number | null>(null);

  // Store latest chat data for resume functionality
  const latestChatDataRef = useRef<{
    chatHistory: ChatMessageType[];
    participantCharacterNames: string[];
  } | null>(null);

  // Cancel pending response (timer only - non-streaming API can't be aborted)
  const cancelPending = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingTimestampRef.current = null;
    // Note: If generation is in progress, it will complete but the result won't be sent
    // since pendingTimestampRef will be null
  }, []);

  // Generate response using non-streaming API for reliability
  const generateResponse = useCallback(
    async (
      chatHistory: ChatMessageType[],
      participantCharacterNames: string[]
    ) => {
      if (!myCharacter || !isApiReady || !providerSettings) return null;

      setIsGenerating(true);

      try {
        // Create generation context for group chat
        const context = createGroupChatContext({
          character: myCharacter,
          messages: chatHistory.slice(-20),
          participantNames: participantCharacterNames,
          theme,
          myPeerId,
        });

        // Generate response (non-streaming for reliability)
        // All messages are already in the context, no need to pass userMessage
        const result = await generateAIResponse({
          context,
          providerId,
          providerSettings,
          model,
          temperature,
          maxTokens: 8192,
        });

        // Only return if we have actual content
        if (!result.content || result.content.trim().length === 0) {
          console.warn("[AutoReply] Empty response received");
          setIsGenerating(false);
          return null;
        }

        setIsGenerating(false);
        return result.content.trim();
      } catch (error) {
        console.error("[AutoReply] Error generating response:", error);
        setIsGenerating(false);
        return null;
      }
    },
    [
      myPeerId,
      myCharacter,
      providerId,
      providerSettings,
      isApiReady,
      model,
      temperature,
      theme,
    ]
  );

  // Use ref to track if currently generating to avoid stale closure
  const isGeneratingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Schedule a response with debouncing
  const scheduleResponse = useCallback(
    (
      chatHistory: ChatMessageType[],
      participantCharacterNames: string[]
    ) => {
      // Store latest chat data
      latestChatDataRef.current = { chatHistory, participantCharacterNames };

      // Don't schedule if already generating - wait for current to complete
      if (isGeneratingRef.current) {
        console.log("[AutoReply] Skipping - already generating");
        return;
      }

      // Cancel any pending timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Record when we started waiting
      const timestamp = Date.now();
      pendingTimestampRef.current = timestamp;

      // Set timer for delayed response
      timerRef.current = setTimeout(async () => {
        // Check if we were cancelled
        if (pendingTimestampRef.current !== timestamp) {
          console.log("[AutoReply] Cancelled by newer event");
          return;
        }

        // Double check we're not already generating
        if (isGeneratingRef.current) {
          console.log("[AutoReply] Skipping - generation started elsewhere");
          return;
        }

        const content = await generateResponse(
          chatHistory,
          participantCharacterNames
        );
        if (content) {
          onResponse?.(content);
        }
        pendingTimestampRef.current = null;
      }, delayMs);
    },
    [delayMs, generateResponse, onResponse]
  );

  // Handle incoming message
  const handleMessage = useCallback(
    (
      message: ChatMessageType,
      chatHistory: ChatMessageType[],
      participantCharacterNames: string[]
    ) => {
      if (!enabled || !myPeerId || !myCharacter || !isApiReady) return;

      // Don't respond to own messages
      if (message.senderId === myPeerId) return;

      scheduleResponse(chatHistory, participantCharacterNames);
    },
    [enabled, myPeerId, myCharacter, isApiReady, scheduleResponse]
  );

  // Handle thinking event from other participants
  // If another participant starts thinking within debounce window, cancel our pending
  const handleThinkingEvent = useCallback(
    (peerId: string, isThinking: boolean, eventTimestamp: number) => {
      // Only care about other peers starting to think
      if (peerId === myPeerId || !isThinking) return;

      // If we have a pending response scheduled
      if (pendingTimestampRef.current !== null) {
        // Check if the thinking event is within debounce window of our pending
        const timeSincePending = eventTimestamp - pendingTimestampRef.current;

        if (timeSincePending >= 0 && timeSincePending < DEBOUNCE_WINDOW_MS) {
          console.log(
            `[AutoReply] Cancelled - other peer (${peerId}) started thinking ${timeSincePending}ms after our pending`
          );
          cancelPending();
        }
      }
    },
    [myPeerId, cancelPending]
  );

  // Resume/trigger generation when auto-reply is turned on
  const triggerGeneration = useCallback(
    (
      chatHistory: ChatMessageType[],
      participantCharacterNames: string[]
    ) => {
      if (!myPeerId || !myCharacter || !isApiReady) return;
      if (chatHistory.length === 0) return;

      // Get the last message
      const lastMessage = chatHistory[chatHistory.length - 1];
      if (!lastMessage) return;

      // Don't respond to our own messages
      if (lastMessage.senderId === myPeerId) return;

      scheduleResponse(chatHistory, participantCharacterNames);
    },
    [myPeerId, myCharacter, isApiReady, scheduleResponse]
  );

  return {
    isGenerating,
    handleMessage,
    handleThinkingEvent,
    triggerGeneration,
    cancelPending,
    generateResponse,
  };
}
