"use client";

import { useCallback, useRef, useState } from "react";

export interface GeneratedCharacter {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleDialogue: string;
  systemPrompt: string;
  tags: string[];
}

export interface UseGenerateCharacterOptions {
  apiKey: string | null;
  onSuccess?: (character: GeneratedCharacter) => void;
  onError?: (error: Error) => void;
}

export interface GenerateCharacterState {
  isGenerating: boolean;
  character: GeneratedCharacter | null;
  error: Error | null;
}

export function useGenerateCharacter({
  apiKey,
  onSuccess,
  onError,
}: UseGenerateCharacterOptions) {
  const [state, setState] = useState<GenerateCharacterState>({
    isGenerating: false,
    character: null,
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (
      image: File,
      context?: string,
      options?: { apiKey?: string }
    ): Promise<GeneratedCharacter | null> => {
      const effectiveApiKey = options?.apiKey ?? apiKey;
      if (!effectiveApiKey) {
        const error = new Error("API key is required");
        setState((prev) => ({ ...prev, error }));
        onError?.(error);
        return null;
      }

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState({ isGenerating: true, character: null, error: null });

      try {
        const formData = new FormData();
        formData.append("image", image);
        formData.append("apiKey", effectiveApiKey);
        if (context) {
          formData.append("context", context);
        }

        const response = await fetch("/api/generate-character", {
          method: "POST",
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `Request failed: ${response.status}`);
        }

        const character = (await response.json()) as GeneratedCharacter;

        setState({
          isGenerating: false,
          character,
          error: null,
        });
        onSuccess?.(character);

        return character;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setState((prev) => ({ ...prev, isGenerating: false }));
          return null;
        }

        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        setState({ isGenerating: false, character: null, error: errorObj });
        onError?.(errorObj);
        return null;
      }
    },
    [apiKey, onSuccess, onError]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({ ...prev, isGenerating: false }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({ isGenerating: false, character: null, error: null });
  }, [cancel]);

  return {
    ...state,
    generate,
    cancel,
    reset,
  };
}
