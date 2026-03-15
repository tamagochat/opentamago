"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { nanoid } from "nanoid";
import type { AssistantMessage, AssetType } from "../assistant-types";
import { buildSystemPrompt, type CharacterAssistantContext } from "../assistant-context";
import { streamChatResponse } from "~/lib/ai/client";
import { useGenerationSettings } from "~/lib/db/hooks/useGenerationSettings";
import { useProviderSettings } from "~/lib/db/hooks/useProviderSettings";
import { PROVIDER_CONFIGS, type Provider } from "~/lib/ai/providers";
import type { LLMProvider } from "~/lib/ai";

interface UseEditorAssistantOptions {
  characterContext: CharacterAssistantContext;
  maxHistoryMessages?: number;
}

interface MissingApiKeyInfo {
  providerId: Provider;
  providerName: string;
}

interface UseEditorAssistantReturn {
  messages: AssistantMessage[];
  isLoading: boolean;
  error: string | null;
  missingApiKey: MissingApiKeyInfo | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  abortGeneration: () => void;
}

export function useEditorAssistant({
  characterContext,
  maxHistoryMessages = 20,
}: UseEditorAssistantOptions): UseEditorAssistantReturn {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { getSettings } = useGenerationSettings();
  const { providers, isProviderReady } = useProviderSettings();

  // Check if API key is configured for the current provider
  const missingApiKey = useMemo((): MissingApiKeyInfo | null => {
    const aibotSettings = getSettings("text_aibot");
    const providerId = (aibotSettings?.providerId ?? "gemini") as Provider;
    const config = PROVIDER_CONFIGS[providerId];

    if (config?.requiresApiKey && !isProviderReady(providerId)) {
      return {
        providerId,
        providerName: config.name,
      };
    }
    return null;
  }, [getSettings, isProviderReady]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      const userMessage: AssistantMessage = {
        id: nanoid(),
        role: "user",
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        // Get aibot settings
        const aibotSettings = getSettings("text_aibot");
        const providerId = (aibotSettings?.providerId ?? "gemini") as LLMProvider;
        const providerSettings = providers.get(providerId);

        if (!providerSettings) {
          throw new Error("Provider settings not found. Please configure API settings first.");
        }

        // Build system prompt with character context
        const systemPrompt = buildSystemPrompt(characterContext);

        // Build messages for API
        const apiMessages = [
          { role: "system" as const, content: systemPrompt },
          ...messages.slice(-maxHistoryMessages).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content },
        ];

        // Create assistant message placeholder
        const assistantMessageId = nanoid();
        const assistantMessage: AssistantMessage = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Stream response
        const stream = streamChatResponse({
          messages: apiMessages,
          providerId,
          providerSettings,
          model: aibotSettings?.model,
          temperature: aibotSettings?.temperature ?? 0.1,
          maxTokens: aibotSettings?.maxTokens ?? 4096,
          signal: abortControllerRef.current.signal,
        });

        let fullContent = "";
        for await (const chunk of stream) {
          fullContent += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId ? { ...m, content: fullContent } : m
            )
          );
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Generation was aborted, don't show error
          return;
        }
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        console.error("Assistant error:", err);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, characterContext, getSettings, providers, maxHistoryMessages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const abortGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    error,
    missingApiKey,
    sendMessage,
    clearMessages,
    abortGeneration,
  };
}
