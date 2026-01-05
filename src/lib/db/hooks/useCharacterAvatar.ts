"use client";

import type { RxDocument } from "rxdb";
import type { CharacterDocument } from "~/lib/db/schemas";

/**
 * Hook to load character avatar from avatarData field
 * @param character - Character document from RxDB
 * @returns Avatar data URL for display, or null if not available
 */
export function useCharacterAvatar(
  character: RxDocument<CharacterDocument> | null
) {
  // Simply return avatarData field directly (no state needed)
  const avatarUrl = character?.avatarData ?? null;

  return { avatarUrl, isLoading: false };
}
