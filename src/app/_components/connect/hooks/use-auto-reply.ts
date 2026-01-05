"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CharacterData, CharacterInfo, ChatMessageType } from "~/lib/connect/messages";
import { CONNECT_CONFIG } from "~/lib/connect";
import { generateChatResponse } from "~/lib/ai";

// Debounce window - cancel if other events happen within this time
const DEBOUNCE_WINDOW_MS = 5000;

interface UseAutoReplyOptions {
  myPeerId: string | null;
  myCharacter: CharacterData | null;
  enabled: boolean;
  delayMs?: number;
  apiKey?: string | null; // Optional - only needed in client mode
  isApiReady?: boolean; // Whether API is ready to use (server mode or client mode with key)
  isClientMode?: boolean; // Whether to call Gemini directly (client mode) or through server
  model?: string;
  temperature?: number;
  onResponse?: (content: string) => void;
}

export function useAutoReply({
  myPeerId,
  myCharacter,
  enabled,
  delayMs = CONNECT_CONFIG.DEFAULT_AUTO_REPLY_DELAY,
  apiKey,
  isApiReady = true,
  isClientMode = false,
  model = "gemini-3-flash-preview",
  temperature = 0.9,
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
      if (!myCharacter || !isApiReady) return null;

      setIsGenerating(true);

      try {
        // Build system prompt
        const otherCharactersList = participantCharacterNames
          .filter((name) => name !== myCharacter.name)
          .join(", ");

        const systemPrompt = `You are ${myCharacter.name}.

About you: ${myCharacter.description}

Your personality: ${myCharacter.personality}

${myCharacter.systemPrompt || ""}

You are in a group chat with these other characters: ${otherCharactersList || "no one else yet"}.

Respond naturally as ${
          myCharacter.name
        }. Keep responses concise (1-3 sentences).
Stay in character at all times. Do not use asterisks for actions.

IMPORTANT: Do not prefix your response with your name or any label like "${myCharacter.name}:". Just start directly with your response text.`;

        // Build messages
        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...chatHistory.slice(-20).map((msg) => ({
            role:
              msg.senderId === myPeerId
                ? ("assistant" as const)
                : ("user" as const),
            content: `${msg.characterName}: ${msg.content}`,
          })),
        ];

        // Use non-streaming API to ensure complete response
        const content = await generateChatResponse({
          messages,
          apiKey: apiKey ?? undefined,
          model,
          temperature,
          maxTokens: 8192,
          isClientMode,
        });

        // Only return if we have actual content
        if (!content || content.trim().length === 0) {
          console.warn("[AutoReply] Empty response received");
          setIsGenerating(false);
          return null;
        }

        setIsGenerating(false);
        return content.trim();
      } catch (error) {
        console.error("[AutoReply] Error generating response:", error);
        setIsGenerating(false);
        return null;
      }
    },
    [
      myPeerId,
      myCharacter,
      apiKey,
      isApiReady,
      isClientMode,
      model,
      temperature,
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
