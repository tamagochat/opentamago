"use client";

import { useState, useCallback } from "react";
import { parseCharXAsync, assetToDataUrl } from "./parser";
import type { ParsedCharX, CharacterCardV3 } from "./types";
import type { CharacterDocument } from "~/lib/db/schemas";

export type CharacterInput = Omit<CharacterDocument, "id" | "createdAt" | "updatedAt">;

/**
 * Extract avatar data URL from parsed charx assets
 */
export function extractAvatarFromCharX(parsed: ParsedCharX): string | undefined {
  if (!parsed.card) return undefined;

  const cardData = parsed.card.data;
  const iconAsset = cardData.assets?.find((a) => a.type === "icon" && a.uri);

  if (iconAsset) {
    const uri = iconAsset.uri.replace("embeded://", "");
    const assetData = parsed.assets.get(uri);
    if (assetData) {
      return assetToDataUrl(assetData, uri) ?? undefined;
    }
  }

  return undefined;
}

/**
 * Convert CharacterCardV3 to CharacterDocument input format
 */
export function convertCardToCharacter(
  card: CharacterCardV3,
  avatarData?: string
): CharacterInput {
  const data = card.data;

  return {
    name: data.name || "Unnamed Character",
    description: data.description || "",
    personality: data.personality || "",
    scenario: data.scenario || "",
    firstMessage: data.first_mes || "",
    exampleDialogue: data.mes_example || "",
    systemPrompt: data.system_prompt || "",
    creatorNotes: data.creator_notes || "",
    tags: data.tags || [],
    avatarData,
  };
}

/**
 * Parse a .charx file and convert to CharacterDocument input format
 */
export async function parseCharXToCharacter(file: File): Promise<CharacterInput> {
  const parsed = await parseCharXAsync(file);

  if (!parsed.card) {
    throw new Error("No character card found in .charx file");
  }

  const avatarData = extractAvatarFromCharX(parsed);
  return convertCardToCharacter(parsed.card, avatarData);
}

export interface UseCharxImportOptions {
  onSuccess?: (character: CharacterInput) => void;
  onError?: (error: Error) => void;
}

export interface UseCharxImportReturn {
  importCharx: (file: File) => Promise<CharacterInput | null>;
  isImporting: boolean;
  error: string | null;
}

/**
 * Hook for importing .charx files
 *
 * Handles parsing with web worker (non-blocking), avatar extraction,
 * and conversion to CharacterDocument format.
 */
export function useCharxImport(options?: UseCharxImportOptions): UseCharxImportReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importCharx = useCallback(
    async (file: File): Promise<CharacterInput | null> => {
      if (!file.name.toLowerCase().endsWith(".charx")) {
        const err = new Error("Invalid file type. Please select a .charx file.");
        setError(err.message);
        options?.onError?.(err);
        return null;
      }

      setIsImporting(true);
      setError(null);

      try {
        const character = await parseCharXToCharacter(file);
        options?.onSuccess?.(character);
        return character;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error.message);
        options?.onError?.(error);
        return null;
      } finally {
        setIsImporting(false);
      }
    },
    [options]
  );

  return {
    importCharx,
    isImporting,
    error,
  };
}
