import type { RxCollectionCreator } from "rxdb";
import {
  characterSchema,
  personaSchema,
  chatSchema,
  messageSchema,
  settingsSchema,
  lorebookEntrySchema,
  characterAssetSchema,
  type CharacterDocument,
  type PersonaDocument,
  type ChatDocument,
  type MessageDocument,
  type SettingsDocument,
  type LorebookEntryDocument,
  type CharacterAssetDocument,
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
      // No migration strategies needed for version 0 schemas
    } as RxCollectionCreator<MessageDocument>,

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
      },
    } as RxCollectionCreator<SettingsDocument>,

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
  };
}
