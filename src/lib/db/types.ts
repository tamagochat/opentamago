import type { RxDatabase, RxCollection } from "rxdb";
import type {
  CharacterDocument,
  PersonaDocument,
  ChatDocument,
  MessageDocument,
  SettingsDocument,
  LorebookEntryDocument,
  CharacterAssetDocument,
} from "./schemas";

export interface DatabaseCollections {
  characters: RxCollection<CharacterDocument>;
  personas: RxCollection<PersonaDocument>;
  chats: RxCollection<ChatDocument>;
  messages: RxCollection<MessageDocument>;
  settings: RxCollection<SettingsDocument>;
  lorebookEntries: RxCollection<LorebookEntryDocument>;
  characterAssets: RxCollection<CharacterAssetDocument>;
}

export type Database = RxDatabase<DatabaseCollections>;
