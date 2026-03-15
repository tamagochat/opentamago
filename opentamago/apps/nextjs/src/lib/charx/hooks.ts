"use client";

import { useState, useCallback } from "react";
import { parseCharXAsync } from "./parser";
import type { ParsedCharX, CharacterCardV3, CharacterCardV3Data } from "./types";
import type { CharacterDocument, LorebookEntryDocument, CharacterAssetDocument } from "~/lib/db/schemas";
import { convertToWebP, uint8ArrayToBlob, detectImageMimeType } from "~/lib/image-utils";

export type CharacterInput = Omit<CharacterDocument, "id" | "createdAt" | "updatedAt">;

/**
 * Validate and parse a Character Card V3 JSON object
 * Supports both wrapped format (with spec/data) and raw data format
 */
export function parseCharacterCardV3Json(json: unknown): CharacterCardV3 {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid JSON: expected an object");
  }

  const obj = json as Record<string, unknown>;

  // Check if this is a wrapped format (spec + data) or raw data
  let cardData: CharacterCardV3Data;

  if ("spec" in obj && "data" in obj) {
    // Wrapped format: { spec: "chara_card_v3", spec_version: "3.0", data: {...} }
    const spec = obj.spec as string;
    if (spec !== "chara_card_v3" && !spec.startsWith("chara_card")) {
      throw new Error(`Unsupported character card spec: ${spec}. Expected "chara_card_v3".`);
    }
    cardData = obj.data as CharacterCardV3Data;
  } else if ("name" in obj) {
    // Raw data format - the object is the data directly
    // This also supports legacy V2 format which has similar fields
    cardData = obj as unknown as CharacterCardV3Data;
  } else {
    throw new Error("Invalid character card format: missing required 'name' field");
  }

  // Validate required fields
  if (!cardData.name || typeof cardData.name !== "string") {
    throw new Error("Invalid character card: 'name' is required and must be a string");
  }

  // Normalize and provide defaults for optional fields
  const normalizedData: CharacterCardV3Data = {
    name: cardData.name,
    description: cardData.description || "",
    personality: cardData.personality || "",
    scenario: cardData.scenario || "",
    first_mes: cardData.first_mes || "",
    mes_example: cardData.mes_example || "",
    creator_notes: cardData.creator_notes || "",
    creator_notes_multilingual: cardData.creator_notes_multilingual,
    system_prompt: cardData.system_prompt || "",
    post_history_instructions: cardData.post_history_instructions || "",
    alternate_greetings: Array.isArray(cardData.alternate_greetings)
      ? cardData.alternate_greetings
      : [],
    tags: Array.isArray(cardData.tags) ? cardData.tags : [],
    creator: cardData.creator || "",
    character_version: cardData.character_version || "",
    group_only_greetings: Array.isArray(cardData.group_only_greetings)
      ? cardData.group_only_greetings
      : [],
    nickname: cardData.nickname || "",
    source: Array.isArray(cardData.source) ? cardData.source : undefined,
    creation_date: cardData.creation_date,
    modification_date: cardData.modification_date,
    character_book: cardData.character_book,
    assets: Array.isArray(cardData.assets) ? cardData.assets : [],
    extensions: cardData.extensions || {},
  };

  return {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: normalizedData,
  };
}

/**
 * Parse a Character Card V3 JSON file and convert to CharacterDocument input format
 * Returns character data and lorebook entries (no assets since JSON doesn't include binary data)
 */
export async function parseJsonToCharacter(file: File): Promise<{
  character: CharacterInput;
  avatarBlob?: Blob;
  lorebookEntries: Array<Omit<LorebookEntryDocument, "id" | "characterId" | "createdAt" | "updatedAt">>;
  assets: Array<{
    data: Uint8Array;
    metadata: Omit<CharacterAssetDocument, "id" | "characterId" | "createdAt" | "updatedAt">;
  }>;
}> {
  const text = await file.text();

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file: failed to parse");
  }

  const card = parseCharacterCardV3Json(json);
  const character = convertCardToCharacter(card);

  // Extract lorebook entries
  const lorebookEntries: Array<Omit<LorebookEntryDocument, "id" | "characterId" | "createdAt" | "updatedAt">> = [];
  if (card.data.character_book) {
    const book = card.data.character_book;
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

  // JSON files don't include binary assets, so return empty array
  return {
    character,
    avatarBlob: undefined,
    lorebookEntries,
    assets: [],
  };
}

/**
 * Parse either a .charx or .json file and return character data
 */
export async function parseCharacterFile(file: File): Promise<{
  character: CharacterInput;
  avatarBlob?: Blob;
  lorebookEntries: Array<Omit<LorebookEntryDocument, "id" | "characterId" | "createdAt" | "updatedAt">>;
  assets: Array<{
    data: Uint8Array;
    metadata: Omit<CharacterAssetDocument, "id" | "characterId" | "createdAt" | "updatedAt">;
  }>;
}> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".charx")) {
    return parseCharXToCharacter(file);
  } else if (fileName.endsWith(".json")) {
    return parseJsonToCharacter(file);
  } else {
    throw new Error("Unsupported file type. Please use .charx or .json files.");
  }
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
