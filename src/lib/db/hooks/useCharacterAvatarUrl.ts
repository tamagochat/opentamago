"use client";

import type { CharacterDocument } from "~/lib/db/schemas";

/**
 * Hook to load character avatar URL from avatarData field
 * Works with plain CharacterDocument objects (not RxDocuments)
 *
 * @param character - Plain character document
 * @returns Avatar data URL for display, or null if not available
 */
export function useCharacterAvatarUrl(character: CharacterDocument | null) {
  // Simply return avatarData field directly (no state needed)
  const avatarUrl = character?.avatarData ?? null;

  return { avatarUrl, isLoading: false };
}
