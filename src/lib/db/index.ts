import {
  addRxPlugin,
  createRxDatabase,
  type RxDatabase,
  type RxCollection,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import {
  characterSchema,
  personaSchema,
  chatSchema,
  messageSchema,
  settingsSchema,
  type CharacterDocument,
  type PersonaDocument,
  type ChatDocument,
  type MessageDocument,
  type SettingsDocument,
} from "./schemas";

// Add RxDB plugins
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);

// Add dev mode plugin in development
if (process.env.NODE_ENV === "development") {
  import("rxdb/plugins/dev-mode").then(({ RxDBDevModePlugin }) => {
    addRxPlugin(RxDBDevModePlugin);
  });
}

export type DatabaseCollections = {
  characters: RxCollection<CharacterDocument>;
  personas: RxCollection<PersonaDocument>;
  chats: RxCollection<ChatDocument>;
  messages: RxCollection<MessageDocument>;
  settings: RxCollection<SettingsDocument>;
};

export type Database = RxDatabase<DatabaseCollections>;

let dbPromise: Promise<Database> | null = null;
let hasResetOnce = false;

const isDev = process.env.NODE_ENV === "development";

// Get storage with validation in dev mode
function getStorage() {
  const baseStorage = getRxStorageDexie();

  if (isDev) {
    // Wrap with AJV validator in dev mode
    return wrappedValidateAjvStorage({ storage: baseStorage });
  }

  return baseStorage;
}

export async function getDatabase(): Promise<Database> {
  if (dbPromise) return dbPromise;

  dbPromise = createRxDatabase<DatabaseCollections>({
    name: "opentamago",
    storage: getStorage(),
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: isDev, // Allow duplicate in dev mode for hot reload
  })
    .then(async (db) => {
      try {
        await db.addCollections({
          characters: {
            schema: characterSchema,
            migrationStrategies: {
              1: (oldDoc: any) => oldDoc, // Simple migration: keep existing data
            },
          },
          personas: {
            schema: personaSchema,
            // Version 0 schema, no migration needed
          },
          chats: {
            schema: chatSchema,
            // No migration strategies needed for version 0 schemas
          },
          messages: {
            schema: messageSchema,
            // No migration strategies needed for version 0 schemas
          },
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
          },
        });
      } catch (error: any) {
        // If schema mismatch error, delete the database and create fresh
        const isSchemaError =
          error?.code === "DB6" ||
          error?.code === "COL12" ||
          error?.message?.includes("DB6") ||
          error?.message?.includes("COL12") ||
          error?.message?.includes("different schema") ||
          error?.message?.includes("migrationStrategy");

        if (isSchemaError && !hasResetOnce) {
          hasResetOnce = true;
          console.warn("Database schema mismatch detected. Deleting and recreating database...");

          // Use RxDB's remove() to properly delete all database data
          try {
            await db.remove();
            console.log("Database removed successfully.");
          } catch {
            // If remove fails, try closing and manual deletion
            try {
              await db.close();
            } catch {
              // Ignore
            }
            // Delete all RxDB-related IndexedDB databases
            if (typeof window !== "undefined" && window.indexedDB) {
              const databases = await window.indexedDB.databases?.() ?? [];
              for (const dbInfo of databases) {
                if (dbInfo.name?.includes("opentamago") || dbInfo.name?.includes("rxdb")) {
                  await new Promise<void>((resolve) => {
                    const deleteReq = window.indexedDB.deleteDatabase(dbInfo.name!);
                    deleteReq.onsuccess = () => resolve();
                    deleteReq.onerror = () => resolve();
                    deleteReq.onblocked = () => resolve();
                  });
                }
              }
            }
          }

          // Clear promise and create new database
          dbPromise = null;
          return getDatabase();
        }

        throw error;
      }

      return db;
    })
    .catch((error) => {
      // Reset promise on error so we can retry
      dbPromise = null;
      throw error;
    });

  return dbPromise;
}

export * from "./schemas";
