"use client";

import { useCallback, useRef, useState } from "react";
import type { SafetySettings, SupportedModel } from "~/lib/ai";
import { streamChatResponse } from "~/lib/ai/client";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface UseChatOptions {
  apiKey: string | null;
  isClientMode: boolean;
  model?: SupportedModel | string;
  temperature?: number;
  maxTokens?: number;
  safetySettings?: SafetySettings;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
}

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  error: Error | null;
}

export function useChat({
  apiKey,
  isClientMode,
  model,
  temperature,
  maxTokens,
  safetySettings,
  onStreamStart,
  onStreamEnd,
  onError,
}: UseChatOptions) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: "",
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      messages: ChatMessage[],
      options?: Partial<UseChatOptions>
    ): Promise<string | null> => {
      const effectiveApiKey = options?.apiKey ?? apiKey;
      const effectiveIsClientMode = options?.isClientMode ?? isClientMode;

      // In client mode, API key is required
      if (effectiveIsClientMode && !effectiveApiKey) {
        const error = new Error("API key is required in client mode");
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
        return null;
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState({ isStreaming: true, content: "", error: null });
      onStreamStart?.();

      try {
        let fullContent = "";

        // Use streamChatResponse from client library
        const stream = streamChatResponse({
          messages,
          apiKey: effectiveApiKey ?? undefined,
          isClientMode: effectiveIsClientMode,
          model: options?.model ?? model,
          temperature: options?.temperature ?? temperature,
          maxTokens: options?.maxTokens ?? maxTokens,
          safetySettings: options?.safetySettings ?? safetySettings,
          signal: abortControllerRef.current.signal,
        });

        // Stream chunks as they arrive
        for await (const chunk of stream) {
          fullContent += chunk;

          setState((prev) => ({
            ...prev,
            content: fullContent,
          }));
        }

        setState((prev) => ({
          ...prev,
          isStreaming: false,
          content: fullContent,
        }));
        onStreamEnd?.();

        return fullContent;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setState((prev) => ({ ...prev, isStreaming: false }));
          return null;
        }

        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        setState({ isStreaming: false, content: "", error: errorObj });
        onError?.(errorObj);
        onStreamEnd?.();
        return null;
      }
    },
    [
      apiKey,
      isClientMode,
      model,
      temperature,
      maxTokens,
      safetySettings,
      onStreamStart,
      onStreamEnd,
      onError,
    ]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({ isStreaming: false, content: "", error: null });
  }, [cancel]);

  return {
    ...state,
    sendMessage,
    cancel,
    reset,
  };
}
