import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { useDatabase } from "./useDatabase";
import type { CharacterAssetDocument } from "../schemas/character-asset";
import { uint8ArrayToBlob, detectImageMimeType } from "~/lib/image-utils";
import type { RxDocument, RxAttachment } from "rxdb";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export type CharacterAssetInput = Omit<
  CharacterAssetDocument,
  "id" | "createdAt" | "updatedAt"
>;

export interface AssetWithData extends CharacterAssetDocument {
  dataUrl?: string; // Data URL for display
}

export function useCharacterAssets(characterId?: string) {
  const { db } = useDatabase();
  const [assets, setAssets] = useState<CharacterAssetDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to character assets
  useEffect(() => {
    if (!db || !characterId) {
      setAssets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const subscription = db.characterAssets
      .find({
        selector: {
          characterId,
        },
        sort: [{ createdAt: "asc" }],
      })
      .$.subscribe((docs: RxDocument<CharacterAssetDocument>[]) => {
        setAssets(docs.map((doc: RxDocument<CharacterAssetDocument>) => toMutable<CharacterAssetDocument>(doc.toJSON())));
        setIsLoading(false);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [db, characterId]);

  // Create a new character asset with attachment
  const createAsset = useCallback(
    async (input: CharacterAssetInput, data: Uint8Array) => {
      if (!db) throw new Error("Database not initialized");

      const now = Date.now();
      const assetId = nanoid();
      const asset: CharacterAssetDocument = {
        ...input,
        id: assetId,
        createdAt: now,
        updatedAt: now,
      };

      // Insert the document
      const doc = await db.characterAssets.insert(asset);

      // Attach the binary data
      const mimeType = detectImageMimeType(data);
      const blob = uint8ArrayToBlob(data, mimeType);
      const attachmentId = `asset-${assetId}.${input.ext}`;

      await doc.putAttachment({
        id: attachmentId,
        data: blob,
        type: mimeType,
      });

      return asset;
    },
    [db],
  );

  // Create multiple character assets in bulk
  const createAssets = useCallback(
    async (
      inputs: Array<{
        metadata: CharacterAssetInput;
        data: Uint8Array;
      }>,
    ) => {
      if (!db) throw new Error("Database not initialized");

      const now = Date.now();
      const assets: CharacterAssetDocument[] = [];

      for (const { metadata, data } of inputs) {
        const assetId = nanoid();
        const asset: CharacterAssetDocument = {
          ...metadata,
          id: assetId,
          createdAt: now,
          updatedAt: now,
        };

        // Insert the document
        const doc = await db.characterAssets.insert(asset);

        // Attach the binary data
        const mimeType = detectImageMimeType(data);
        const blob = uint8ArrayToBlob(data, mimeType);
        const attachmentId = `asset-${assetId}.${metadata.ext}`;

        await doc.putAttachment({
          id: attachmentId,
          data: blob,
          type: mimeType,
        });

        assets.push(asset);
      }

      return assets;
    },
    [db],
  );

  // Get asset data as data URL for display
  const getAssetDataUrl = useCallback(
    async (assetId: string): Promise<string | null> => {
      if (!db) throw new Error("Database not initialized");

      const doc = await db.characterAssets.findOne(assetId).exec();
      if (!doc) return null;

      const attachments = doc.allAttachments();
      const attachmentArray = Array.from(attachments);

      if (attachmentArray.length === 0) return null;

      const attachment = attachmentArray[0] as RxAttachment<CharacterAssetDocument>;
      if (!attachment) return null;

      const data = await attachment.getData();
      const blob = new Blob([data], { type: attachment.type });

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },
    [db],
  );

  // Get asset data as Blob
  const getAssetBlob = useCallback(
    async (assetId: string): Promise<Blob | null> => {
      if (!db) throw new Error("Database not initialized");

      const doc = await db.characterAssets.findOne(assetId).exec();
      if (!doc) return null;

      const attachments = doc.allAttachments();
      const attachmentArray = Array.from(attachments);

      if (attachmentArray.length === 0) return null;

      const attachment = attachmentArray[0] as RxAttachment<CharacterAssetDocument>;
      if (!attachment) return null;

      const data = await attachment.getData();
      return new Blob([data], { type: attachment.type });
    },
    [db],
  );

  // Delete a character asset
  const deleteAsset = useCallback(
    async (id: string) => {
      if (!db) throw new Error("Database not initialized");

      const doc = await db.characterAssets.findOne(id).exec();
      if (!doc) throw new Error(`Character asset ${id} not found`);

      await doc.remove();
    },
    [db],
  );

  // Delete all assets for a character
  const deleteAssetsByCharacter = useCallback(
    async (characterId: string) => {
      if (!db) throw new Error("Database not initialized");

      const docs = await db.characterAssets
        .find({
          selector: { characterId },
        })
        .exec();

      await Promise.all(docs.map((doc: RxDocument<CharacterAssetDocument>) => doc.remove()));
    },
    [db],
  );

  // Get assets by character ID and type
  const getAssetsByType = useCallback(
    async (
      characterId: string,
      assetType: "icon" | "emotion" | "background" | "other",
    ) => {
      if (!db) throw new Error("Database not initialized");

      const docs = await db.characterAssets
        .find({
          selector: {
            characterId,
            assetType,
          },
          sort: [{ createdAt: "asc" }],
        })
        .exec();

      return docs.map((doc: RxDocument<CharacterAssetDocument>) => doc.toJSON());
    },
    [db],
  );

  /**
   * Find an asset by name (with or without extension)
   * Handles edge cases like "Callan_smile5" or "Callan_smile5.png"
   */
  const findAssetByName = useCallback(
    (name: string): CharacterAssetDocument | null => {
      if (!name) return null;

      // Normalize the name by removing extension if present
      const nameWithoutExt = name.replace(/\.[^.]+$/, "");

      // First try exact match on name
      const exactMatch = assets.find((asset) => asset.name === name);
      if (exactMatch) return exactMatch;

      // Try matching without extension
      const noExtMatch = assets.find((asset) => asset.name === nameWithoutExt);
      if (noExtMatch) return noExtMatch;

      // Try matching asset name without its extension against input
      const assetNoExtMatch = assets.find((asset) => {
        const assetNameWithoutExt = asset.name.replace(/\.[^.]+$/, "");
        return assetNameWithoutExt === name || assetNameWithoutExt === nameWithoutExt;
      });
      if (assetNoExtMatch) return assetNoExtMatch;

      // Try case-insensitive match
      const lowerName = nameWithoutExt.toLowerCase();
      const caseInsensitiveMatch = assets.find((asset) => {
        const assetNameWithoutExt = asset.name.replace(/\.[^.]+$/, "").toLowerCase();
        return assetNameWithoutExt === lowerName;
      });

      return caseInsensitiveMatch ?? null;
    },
    [assets],
  );

  return {
    assets,
    isLoading,
    createAsset,
    createAssets,
    getAssetDataUrl,
    getAssetBlob,
    deleteAsset,
    deleteAssetsByCharacter,
    getAssetsByType,
    findAssetByName,
  };
}
