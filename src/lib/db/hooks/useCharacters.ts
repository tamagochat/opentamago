"use client";

import { useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { nanoid } from "nanoid";
import { useDatabase } from "./useDatabase";
import type { CharacterDocument } from "../schemas";
import type { LorebookEntryDocument } from "../schemas/lorebook";
import type { CharacterAssetDocument } from "../schemas/character-asset";
import { uint8ArrayToBlob, detectImageMimeType, convertToWebP, blobToDataUrl } from "~/lib/image-utils";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export function useCharacters() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [characters, setCharacters] = useState<CharacterDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const subscription = db.characters
      .find()
      .sort({ updatedAt: "desc" })
      .$
      .subscribe((docs) => {
        setCharacters(docs.map((doc) => toMutable<CharacterDocument>(doc.toJSON())));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db]);

  const createCharacter = useCallback(
    async (data: Omit<CharacterDocument, "id" | "createdAt" | "updatedAt">) => {
      if (!db) {
        console.error("Database not initialized");
        return null;
      }

      try {
        const now = Date.now();
        const character: CharacterDocument = {
          ...data,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };

        console.log("Inserting character:", character);
        await db.characters.insert(character);
        console.log("Character inserted successfully");
        return character;
      } catch (error) {
        console.error("Error inserting character:", error);
        throw error;
      }
    },
    [db]
  );

  const updateCharacter = useCallback(
    async (id: string, data: Partial<CharacterDocument>) => {
      if (!db) return null;

      const doc = await db.characters.findOne(id).exec();
      if (!doc) return null;

      await doc.patch({
        ...data,
        updatedAt: Date.now(),
      });

      return toMutable<CharacterDocument>(doc.toJSON());
    },
    [db]
  );

  const deleteCharacter = useCallback(
    async (id: string) => {
      if (!db) return false;

      const doc = await db.characters.findOne(id).exec();
      if (!doc) return false;

      // Delete associated chats and messages
      const chats = await db.chats.find({ selector: { characterId: id } }).exec();
      for (const chat of chats) {
        await db.messages.find({ selector: { chatId: chat.id } }).remove();
      }
      await db.chats.find({ selector: { characterId: id } }).remove();

      // Delete associated lorebook entries
      await db.lorebookEntries.find({ selector: { characterId: id } }).remove();

      // Delete associated character assets
      await db.characterAssets.find({ selector: { characterId: id } }).remove();

      await doc.remove();
      return true;
    },
    [db]
  );

  const getCharacter = useCallback(
    async (id: string) => {
      if (!db) return null;

      const doc = await db.characters.findOne(id).exec();
      return doc ? toMutable<CharacterDocument>(doc.toJSON()) : null;
    },
    [db]
  );

  /**
   * Comprehensive function to save a character with all associated data:
   * - Character document (with avatarData as data URL for immediate display)
   * - Avatar (as RxDB attachment in WebP format for optimal storage)
   * - Lorebook entries
   * - Character assets (emotions, backgrounds, etc.)
   *
   * This function can be used across /charx, /chat, and /p2p for consistent character saving.
   * If avatarBlob is provided and avatarData is missing, it will be converted to a data URL
   * and saved in the character's avatarData field for immediate availability.
   */
  const saveCharacterWithAssets = useCallback(
    async (input: {
      character: Omit<CharacterDocument, "id" | "createdAt" | "updatedAt">;
      avatarBlob?: Blob;
      lorebookEntries?: Array<Omit<LorebookEntryDocument, "id" | "characterId" | "createdAt" | "updatedAt">>;
      assets?: Array<{
        data: Uint8Array;
        metadata: Omit<CharacterAssetDocument, "id" | "characterId" | "createdAt" | "updatedAt">;
      }>;
    }) => {
      if (!db) {
        console.error("Database not initialized");
        throw new Error("Database not initialized");
      }

      try {
        const now = Date.now();
        const characterId = uuidv4();

        // 1. Convert avatar blob to data URL for immediate availability
        let avatarDataUrl: string | undefined = input.character.avatarData;
        if (input.avatarBlob && !avatarDataUrl) {
          try {
            avatarDataUrl = await blobToDataUrl(input.avatarBlob);
            console.log("Converted avatar blob to data URL for avatarData field");
          } catch (error) {
            console.error("Failed to convert avatar blob to data URL:", error);
          }
        }

        // 2. Create character document with avatar data URL
        const character: CharacterDocument = {
          ...input.character,
          avatarData: avatarDataUrl,
          id: characterId,
          createdAt: now,
          updatedAt: now,
        };

        console.log("Saving character with assets:", {
          characterId,
          hasAvatar: !!input.avatarBlob,
          hasAvatarData: !!avatarDataUrl,
          lorebookEntriesCount: input.lorebookEntries?.length ?? 0,
          assetsCount: input.assets?.length ?? 0,
        });

        const characterDoc = await db.characters.insert(character);
        console.log("Character document inserted successfully");

        // 3. Save avatar as RxDB attachment for optimal storage (if provided)
        if (input.avatarBlob) {
          try {
            // Convert to WebP for optimal storage
            const webpBlob = await convertToWebP(input.avatarBlob, {
              quality: 0.85,
              maxWidth: 512,
              maxHeight: 512,
            });

            await characterDoc.putAttachment({
              id: "avatar.webp",
              data: webpBlob,
              type: "image/webp",
            });
            console.log("Avatar attachment saved successfully");
          } catch (error) {
            console.error("Error saving avatar attachment:", error);
            // Don't fail the entire operation if avatar fails
          }
        }

        // 4. Save lorebook entries (if provided)
        if (input.lorebookEntries && input.lorebookEntries.length > 0) {
          try {
            const entries: LorebookEntryDocument[] = input.lorebookEntries.map((entry) => ({
              ...entry,
              id: nanoid(),
              characterId,
              createdAt: now,
              updatedAt: now,
            }));

            await db.lorebookEntries.bulkInsert(entries);
            console.log(`Saved ${entries.length} lorebook entries`);
          } catch (error) {
            console.error("Error saving lorebook entries:", error);
            // Don't fail the entire operation if lorebook fails
          }
        }

        // 5. Save character assets (if provided)
        if (input.assets && input.assets.length > 0) {
          try {
            for (const { metadata, data } of input.assets) {
              const assetId = nanoid();
              const asset: CharacterAssetDocument = {
                ...metadata,
                id: assetId,
                characterId,
                createdAt: now,
                updatedAt: now,
              };

              // Insert asset document
              const assetDoc = await db.characterAssets.insert(asset);

              // Attach binary data
              const mimeType = detectImageMimeType(data);
              const blob = uint8ArrayToBlob(data, mimeType);
              const attachmentId = `asset-${assetId}.${metadata.ext}`;

              await assetDoc.putAttachment({
                id: attachmentId,
                data: blob,
                type: mimeType,
              });
            }
            console.log(`Saved ${input.assets.length} character assets`);
          } catch (error) {
            console.error("Error saving character assets:", error);
            // Don't fail the entire operation if assets fail
          }
        }

        console.log("Character saved successfully with all assets");
        return character;
      } catch (error) {
        console.error("Error saving character with assets:", error);
        throw error;
      }
    },
    [db]
  );

  return {
    characters,
    isLoading: dbLoading || isLoading,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacter,
    saveCharacterWithAssets,
  };
}
