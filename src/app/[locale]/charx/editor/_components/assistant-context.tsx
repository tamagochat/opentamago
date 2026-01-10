"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { nanoid } from "nanoid";
import type { AssistantMessage, AssetType } from "~/lib/editor/assistant-types";
import { buildSystemPrompt, type CharacterAssistantContext } from "~/lib/editor/assistant-context";
import { streamChatResponse, generateImage, generateImagePrompt } from "~/lib/ai/client";
import { useGenerationSettings } from "~/lib/db/hooks/useGenerationSettings";
import { useProviderSettings } from "~/lib/db/hooks/useProviderSettings";
import { PROVIDER_CONFIGS, type Provider, type ImageProvider } from "~/lib/ai/providers";
import type { LLMProvider } from "~/lib/ai";
import { useFormContext as useEditorFormContext } from "./editor-context";

// Types
interface MissingApiKeyInfo {
  providerId: Provider;
  providerName: string;
}

// Messages context - for message list
interface MessagesContextValue {
  messages: AssistantMessage[];
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function useMessagesContext() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessagesContext must be used within AssistantProvider");
  }
  return context;
}

// Loading context - for input and loading states
interface LoadingContextValue {
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function useLoadingContext() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoadingContext must be used within AssistantProvider");
  }
  return context;
}

// Error context - for error display
interface ErrorContextValue {
  error: string | null;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorContext must be used within AssistantProvider");
  }
  return context;
}

// API Key context - for API key warning
interface ApiKeyContextValue {
  missingApiKey: MissingApiKeyInfo | null;
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

export function useApiKeyContext() {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error("useApiKeyContext must be used within AssistantProvider");
  }
  return context;
}

// Actions context - for send, clear, abort
interface AssistantActionsContextValue {
  sendMessage: (content: string) => Promise<void>;
  generateImageFromPrompt: (prompt: string, useAiEnhancement: boolean) => Promise<void>;
  clearMessages: () => void;
  abortGeneration: () => void;
  hasMessages: boolean;
}

const AssistantActionsContext = createContext<AssistantActionsContextValue | null>(null);

export function useAssistantActionsContext() {
  const context = useContext(AssistantActionsContext);
  if (!context) {
    throw new Error("useAssistantActionsContext must be used within AssistantProvider");
  }
  return context;
}

// Provider
interface AssistantProviderProps {
  children: ReactNode;
  maxHistoryMessages?: number;
}

export function AssistantProvider({
  children,
  maxHistoryMessages = 20,
}: AssistantProviderProps) {
  const { form } = useEditorFormContext();

  // Use selective watching - only watch the fields needed for AI context
  const name = form.watch("name");
  const description = form.watch("description");
  const personality = form.watch("personality");
  const scenario = form.watch("scenario");
  const tags = form.watch("tags");

  // Memoize character context to prevent unnecessary hook re-runs
  const characterContext = useMemo<CharacterAssistantContext>(
    () => ({ name, description, personality, scenario, tags }),
    [name, description, personality, scenario, tags]
  );

  // State
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep refs for values needed in callbacks to avoid stale closures
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const characterContextRef = useRef(characterContext);
  characterContextRef.current = characterContext;

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

  // Stable send message callback
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

        // Build system prompt with character context (use ref for current value)
        const systemPrompt = buildSystemPrompt(characterContextRef.current);

        // Build messages for API (use ref for current messages)
        const currentMessages = messagesRef.current;
        const apiMessages = [
          { role: "system" as const, content: systemPrompt },
          ...currentMessages.slice(-maxHistoryMessages).map((m) => ({
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
    [getSettings, providers, maxHistoryMessages]
  );

  // Generate image from prompt
  const generateImageFromPrompt = useCallback(
    async (prompt: string, useAiEnhancement: boolean) => {
      if (!prompt.trim()) return;

      // Add user message
      const userMessage: AssistantMessage = {
        id: nanoid(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Get image generation settings
        const imageSettings = getSettings("image");
        const imageProviderId = (imageSettings?.providerId ?? "gemini") as ImageProvider;
        const imageProviderSettings = providers.get(imageProviderId);

        if (!imageProviderSettings) {
          throw new Error(`Provider settings not found for ${imageProviderId}. Please configure API settings first.`);
        }

        let imagePrompt = prompt;

        // Optionally enhance the prompt with AI
        if (useAiEnhancement) {
          const aibotSettings = getSettings("text_aibot");
          const textProviderId = (aibotSettings?.providerId ?? "gemini") as LLMProvider;
          const textProviderSettings = providers.get(textProviderId);

          if (textProviderSettings) {
            const ctx = characterContextRef.current;
            imagePrompt = await generateImagePrompt({
              messageContent: prompt,
              characterName: ctx.name,
              characterDescription: ctx.description,
              characterScenario: ctx.scenario,
              providerId: textProviderId,
              providerSettings: textProviderSettings,
              model: aibotSettings?.model,
            });
          }
        }

        // Create assistant message placeholder
        const assistantMessageId = nanoid();
        const assistantMessage: AssistantMessage = {
          id: assistantMessageId,
          role: "assistant",
          content: useAiEnhancement ? imagePrompt : "",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Generate the image
        const result = await generateImage({
          prompt: imagePrompt,
          providerId: imageProviderId,
          providerSettings: imageProviderSettings,
          model: imageSettings?.model,
          aspectRatio: "1:1",
          resolution: "2K",
        });

        if (result.images.length > 0 && result.images[0]) {
          const imageData = result.images[0];

          // Fetch image from URL and convert to Uint8Array
          let imageBuffer: Uint8Array | undefined;
          try {
            const imageResponse = await fetch(imageData.url);
            const arrayBuffer = await imageResponse.arrayBuffer();
            imageBuffer = new Uint8Array(arrayBuffer);
          } catch (err) {
            console.error("Failed to fetch image data:", err);
          }

          // Update message with image data
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    imageData: imageBuffer,
                    imageDataUrl: imageData.url,
                    suggestedAssetType: "icon" as AssetType,
                  }
                : m
            )
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to generate image";
        setError(errorMessage);
        console.error("Image generation error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [getSettings, providers]
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

  // Memoized context values
  const messagesContextValue = useMemo(
    () => ({ messages }),
    [messages]
  );

  const loadingContextValue = useMemo(
    () => ({ isLoading }),
    [isLoading]
  );

  const errorContextValue = useMemo(
    () => ({ error }),
    [error]
  );

  const apiKeyContextValue = useMemo(
    () => ({ missingApiKey }),
    [missingApiKey]
  );

  const actionsContextValue = useMemo(
    () => ({
      sendMessage,
      generateImageFromPrompt,
      clearMessages,
      abortGeneration,
      hasMessages: messages.length > 0,
    }),
    [sendMessage, generateImageFromPrompt, clearMessages, abortGeneration, messages.length]
  );

  return (
    <MessagesContext.Provider value={messagesContextValue}>
      <LoadingContext.Provider value={loadingContextValue}>
        <ErrorContext.Provider value={errorContextValue}>
          <ApiKeyContext.Provider value={apiKeyContextValue}>
            <AssistantActionsContext.Provider value={actionsContextValue}>
              {children}
            </AssistantActionsContext.Provider>
          </ApiKeyContext.Provider>
        </ErrorContext.Provider>
      </LoadingContext.Provider>
    </MessagesContext.Provider>
  );
}
