import type { RxDatabase, RxCollection } from "rxdb";
import type {
  CharacterDocument,
  PersonaDocument,
  ChatDocument,
  MessageDocument,
  MemoryDocument,
  SettingsDocument,
  ProviderSettingsDocument,
  GenerationSettingsDocument,
  LorebookEntryDocument,
  CharacterAssetDocument,
} from "./schemas";

export interface DatabaseCollections {
  characters: RxCollection<CharacterDocument>;
  personas: RxCollection<PersonaDocument>;
  chats: RxCollection<ChatDocument>;
  messages: RxCollection<MessageDocument>;
  memories: RxCollection<MemoryDocument>;
  settings: RxCollection<SettingsDocument>;
  providerSettings: RxCollection<ProviderSettingsDocument>;
  generationSettings: RxCollection<GenerationSettingsDocument>;
  lorebookEntries: RxCollection<LorebookEntryDocument>;
  characterAssets: RxCollection<CharacterAssetDocument>;
}

export type Database = RxDatabase<DatabaseCollections>;
