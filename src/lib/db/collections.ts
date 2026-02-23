import type { RxCollectionCreator } from "rxdb";
import {
  characterSchema,
  personaSchema,
  chatSchema,
  messageSchema,
  memorySchema,
  settingsSchema,
  providerSettingsSchema,
  generationSettingsSchema,
  lorebookEntrySchema,
  characterAssetSchema,
  collectionSchema,
  type CharacterDocument,
  type PersonaDocument,
  type ChatDocument,
  type MessageDocument,
  type MemoryDocument,
  type SettingsDocument,
  type ProviderSettingsDocument,
  type GenerationSettingsDocument,
  type LorebookEntryDocument,
  type CharacterAssetDocument,
  type CollectionDocument,
} from "./schemas";

export function getCollectionConfig() {
  return {
    characters: {
      schema: characterSchema,
      migrationStrategies: {
        1: (oldDoc: any) => oldDoc, // Simple migration: keep existing data
        2: (oldDoc: any) => {
          // v1 to v2: Enable attachments support
          // Keep avatarData for backward compatibility
          // New imports will use attachments instead
          return oldDoc;
        },
        3: (oldDoc: any) => {
          // v2 to v3: Add CharacterCardV3 fields
          return {
            ...oldDoc,
            postHistoryInstructions: oldDoc.postHistoryInstructions ?? "",
            alternateGreetings: oldDoc.alternateGreetings ?? [],
            creator: oldDoc.creator ?? "",
            characterVersion: oldDoc.characterVersion ?? "",
            groupOnlyGreetings: oldDoc.groupOnlyGreetings ?? [],
            nickname: oldDoc.nickname ?? "",
          };
        },
        4: (oldDoc: any) => {
          // v3 to v4: Add CCv3 compatibility fields
          return {
            ...oldDoc,
            extensions: oldDoc.extensions ?? {},
            creatorNotesMultilingual:
              oldDoc.creatorNotesMultilingual ?? undefined,
            source: oldDoc.source ?? undefined,
          };
        },
        5: (oldDoc: any) => {
          // v4 to v5: Add collection support
          return {
            ...oldDoc,
            collectionId: oldDoc.collectionId ?? undefined,
          };
        },
      },
    } as RxCollectionCreator<CharacterDocument>,

    personas: {
      schema: personaSchema,
      // Version 0 schema, no migration needed
    } as RxCollectionCreator<PersonaDocument>,

    chats: {
      schema: chatSchema,
      migrationStrategies: {
        1: (oldDoc: any) => ({
          ...oldDoc,
          personaId: oldDoc.personaId ?? undefined, // Optional field, keep if exists
        }),
      },
    } as RxCollectionCreator<ChatDocument>,

    messages: {
      schema: messageSchema,
      migrationStrategies: {
        // v0 to v1: Add reasoning and displayedContent fields
        1: (oldDoc: any) => ({
          ...oldDoc,
          reasoning: undefined,
          displayedContent: undefined,
          displayedContentLanguage: undefined,
        }),
        // v1 to v2: Enable attachments support for images and audio
        2: (oldDoc: any) => ({
          ...oldDoc,
          attachmentsMeta: undefined, // No attachments initially
        }),
        // v2 to v3: Add token usage tracking
        3: (oldDoc: any) => ({
          ...oldDoc,
          tokenUsage: undefined, // No usage data for old messages
        }),
      },
    } as RxCollectionCreator<MessageDocument>,

    memories: {
      schema: memorySchema,
      migrationStrategies: {
        1: (oldDoc: any) => {
          // v0 to v1: Add LRU fields (contentHash, source, updatedAt)
          const now = Date.now();
          return {
            ...oldDoc,
            contentHash: oldDoc.contentHash ?? "", // Will be empty for old docs
            source: oldDoc.source ?? "manual",
            sourceId: oldDoc.sourceId ?? undefined,
            updatedAt: oldDoc.updatedAt ?? oldDoc.createdAt ?? now,
          };
        },
      },
    } as RxCollectionCreator<MemoryDocument>,

    settings: {
      schema: settingsSchema,
      migrationStrategies: {
        1: (oldDoc: any) => ({
          ...oldDoc,
          apiMode: oldDoc.apiMode ?? "client", // Default to client mode
        }),
        2: (oldDoc: any) => ({
          ...oldDoc,
          chatBubbleTheme: oldDoc.chatBubbleTheme ?? "roleplay", // Default to roleplay theme
        }),
        3: (oldDoc: any) => ({
          ...oldDoc,
          localeDialogDismissed: false, // Default: show dialog
          localeDialogShownAt: undefined,
        }),
        4: (oldDoc: any) => ({
          ...oldDoc,
          selectedProvider: "gemini", // Default to Gemini
        }),
        5: (oldDoc: any) => ({
          ...oldDoc,
          defaultPersonaId: undefined, // No default persona initially
        }),
      },
    } as RxCollectionCreator<SettingsDocument>,

    providerSettings: {
      schema: providerSettingsSchema,
      // Version 0 schema, no migration needed
    } as RxCollectionCreator<ProviderSettingsDocument>,

    generationSettings: {
      schema: generationSettingsSchema,
      // Version 0 schema - aspectRatio and resolution are optional fields
      // Application code handles defaults when these fields are missing
    } as RxCollectionCreator<GenerationSettingsDocument>,

    lorebookEntries: {
      schema: lorebookEntrySchema,
      migrationStrategies: {
        1: (oldDoc: any) => ({
          ...oldDoc,
          useRegex: oldDoc.useRegex ?? false,
          extensions: oldDoc.extensions ?? {},
          name: oldDoc.name ?? undefined,
        }),
      },
    } as RxCollectionCreator<LorebookEntryDocument>,

    characterAssets: {
      schema: characterAssetSchema,
      // Version 0 schema, no migration needed
    } as RxCollectionCreator<CharacterAssetDocument>,

    characterCollections: {
      schema: collectionSchema,
      // Version 0 schema, no migration needed
    } as RxCollectionCreator<CollectionDocument>,
  };
}
