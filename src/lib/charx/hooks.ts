"use client";

import { useState, useCallback } from "react";
import { parseCharXAsync, assetToDataUrl } from "./parser";
import type { ParsedCharX, CharacterCardV3 } from "./types";
import type { CharacterDocument, LorebookEntryDocument, CharacterAssetDocument } from "~/lib/db/schemas";
import { convertToWebP, uint8ArrayToBlob, detectImageMimeType } from "~/lib/image-utils";

export type CharacterInput = Omit<CharacterDocument, "id" | "createdAt" | "updatedAt">;

/**
 * Extract avatar data URL from parsed charx assets (legacy)
 * Falls back to the first image asset if no icon is found
 * @deprecated Use extractAvatarAsBlob instead for better performance
 */
export function extractAvatarFromCharX(parsed: ParsedCharX): string | undefined {
  if (!parsed.card) return undefined;

  const cardData = parsed.card.data;
  let assetData: Uint8Array | undefined;
  let uri: string | undefined;

  // First, try to find an icon asset
  const iconAsset = cardData.assets?.find((a) => a.type === "icon" && a.uri);
  if (iconAsset) {
    uri = iconAsset.uri.replace("embeded://", "");
    assetData = parsed.assets.get(uri);
  }

  // If no icon found, use the first image asset as fallback
  if (!assetData && parsed.assets.size > 0) {
    const firstAsset = parsed.assets.entries().next().value;
    if (firstAsset) {
      uri = firstAsset[0];
      assetData = firstAsset[1];
    }
  }

  if (assetData && uri) {
    return assetToDataUrl(assetData, uri) ?? undefined;
  }

  return undefined;
}

/**
 * Extract and convert avatar to WebP from parsed charx assets
 * Falls back to the first image asset if no icon is found
 */
export async function extractAvatarAsBlob(
  parsed: ParsedCharX
): Promise<Blob | undefined> {
  if (!parsed.card) return undefined;

  const cardData = parsed.card.data;
  let assetData: Uint8Array | undefined;

  // First, try to find an icon asset
  const iconAsset = cardData.assets?.find((a) => a.type === "icon" && a.uri);
  if (iconAsset) {
    const uri = iconAsset.uri.replace("embeded://", "");
    assetData = parsed.assets.get(uri);
  }

  // If no icon found, use the first image asset as fallback
  if (!assetData && parsed.assets.size > 0) {
    const firstAsset = parsed.assets.entries().next().value;
    if (firstAsset) {
      assetData = firstAsset[1]; // [uri, data]
      console.log("No icon asset found, using first image asset as avatar");
    }
  }

  if (assetData) {
    // Detect MIME type and convert Uint8Array to Blob
    const mimeType = detectImageMimeType(assetData);
    const blob = uint8ArrayToBlob(assetData, mimeType);

    // Convert to WebP with compression (skip if already WebP)
    return await convertToWebP(blob, {
      quality: 0.85,
      maxWidth: 512,
      maxHeight: 512,
    });
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
    postHistoryInstructions: data.post_history_instructions || "",
    alternateGreetings: data.alternate_greetings || [],
    creatorNotes: data.creator_notes || "",
    tags: data.tags || [],
    creator: data.creator || "",
    characterVersion: data.character_version || "",
    groupOnlyGreetings: data.group_only_greetings || [],
    nickname: data.nickname || "",
    extensions: data.extensions || {},
    creatorNotesMultilingual: data.creator_notes_multilingual,
    source: data.source,
    avatarData,
  };
}

/**
 * Parse a .charx file and convert to CharacterDocument input format
 * Returns character data, avatar blob, lorebook entries, and assets
 */
export async function parseCharXToCharacter(file: File): Promise<{
  character: CharacterInput;
  avatarBlob?: Blob;
  lorebookEntries: Array<Omit<LorebookEntryDocument, "id" | "characterId" | "createdAt" | "updatedAt">>;
  assets: Array<{
    data: Uint8Array;
    metadata: Omit<CharacterAssetDocument, "id" | "characterId" | "createdAt" | "updatedAt">;
  }>;
}> {
  const parsed = await parseCharXAsync(file);

  if (!parsed.card) {
    throw new Error("No character card found in .charx file");
  }

  const avatarBlob = await extractAvatarAsBlob(parsed);
  const character = convertCardToCharacter(parsed.card);

  // Extract lorebook entries
  const lorebookEntries: Array<Omit<LorebookEntryDocument, "id" | "characterId" | "createdAt" | "updatedAt">> = [];
  if (parsed.card.data.character_book) {
    const book = parsed.card.data.character_book;
    for (const entry of book.entries) {
      lorebookEntries.push({
        keys: entry.keys,
        content: entry.content,
        enabled: entry.enabled,
        insertionOrder: entry.insertion_order,
        caseSensitive: entry.case_sensitive ?? false,
        priority: entry.priority ?? 10,
        selective: entry.selective ?? false,
        secondaryKeys: entry.secondary_keys ?? [],
        constant: entry.constant ?? false,
        position: entry.position || "before_char",
        useRegex: entry.use_regex ?? false,
        extensions: entry.extensions || {},
        name: entry.name,
        comment: entry.comment,
      });
    }
  }

  // Extract assets (excluding icon which is used as avatar)
  const assets: Array<{
    data: Uint8Array;
    metadata: Omit<CharacterAssetDocument, "id" | "characterId" | "createdAt" | "updatedAt">;
  }> = [];

  for (const [uri, data] of parsed.assets) {
    // Skip the icon asset (it's the avatar)
    const assetInfo = parsed.card.data.assets.find((a) => a.uri.replace("embeded://", "") === uri);
    if (assetInfo?.type === "icon") continue;

    // Determine asset type
    let assetType: "icon" | "emotion" | "background" | "other" = "other";
    if (uri.includes("/emotion/")) {
      assetType = "emotion";
    } else if (uri.includes("/background/")) {
      assetType = "background";
    } else if (uri.includes("/icon/")) {
      assetType = "icon";
    }

    const name = assetInfo?.name || uri.split("/").pop() || uri;
    const ext = assetInfo?.ext || uri.split(".").pop() || "";

    assets.push({
      data,
      metadata: {
        assetType,
        name,
        uri,
        ext,
      },
    });
  }

  return {
    character,
    avatarBlob,
    lorebookEntries,
    assets,
  };
}

export interface ParsedCharXData {
  character: CharacterInput;
  avatarBlob?: Blob;
  lorebookEntries: Array<Omit<LorebookEntryDocument, "id" | "characterId" | "createdAt" | "updatedAt">>;
  assets: Array<{
    data: Uint8Array;
    metadata: Omit<CharacterAssetDocument, "id" | "characterId" | "createdAt" | "updatedAt">;
  }>;
}

export interface UseCharxImportOptions {
  onSuccess?: (data: ParsedCharXData) => void;
  onError?: (error: Error) => void;
}

export interface UseCharxImportReturn {
  importCharx: (file: File) => Promise<ParsedCharXData | null>;
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
    async (file: File): Promise<ParsedCharXData | null> => {
      if (!file.name.toLowerCase().endsWith(".charx")) {
        const err = new Error("Invalid file type. Please select a .charx file.");
        setError(err.message);
        options?.onError?.(err);
        return null;
      }

      setIsImporting(true);
      setError(null);

      try {
        const data = await parseCharXToCharacter(file);
        options?.onSuccess?.(data);
        return data;
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
