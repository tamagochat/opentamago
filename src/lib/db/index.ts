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
  chatSchema,
  messageSchema,
  settingsSchema,
  type CharacterDocument,
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
  chats: RxCollection<ChatDocument>;
  messages: RxCollection<MessageDocument>;
  settings: RxCollection<SettingsDocument>;
};

export type Database = RxDatabase<DatabaseCollections>;

let dbPromise: Promise<Database> | null = null;

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
            // No migration strategies needed for version 0 schemas
          },
        });
      } catch (error: any) {
        // If schema mismatch error (DB6), we need to reset the database
        // This happens when the schema structure changed in an incompatible way
        // COL12 error occurs when migration strategies don't match schema versions
        if (
          error?.code === "DB6" ||
          error?.code === "COL12" ||
          error?.message?.includes("DB6") ||
          error?.message?.includes("COL12") ||
          error?.message?.includes("different schema") ||
          error?.message?.includes("migrationStrategy")
        ) {
          console.warn(
            "Database schema mismatch detected. Resetting database to apply new schema..."
          );

          // Clear the promise so we can retry
          dbPromise = null;

          // Delete the IndexedDB database to start fresh
          if (typeof window !== "undefined" && window.indexedDB) {
            try {
              const deleteReq = window.indexedDB.deleteDatabase("opentamago");
              await new Promise<void>((resolve, reject) => {
                deleteReq.onsuccess = () => {
                  console.log("Database deleted successfully. Retrying...");
                  resolve();
                };
                deleteReq.onerror = () => {
                  console.error("Error deleting database:", deleteReq.error);
                  reject(deleteReq.error);
                };
                deleteReq.onblocked = () => {
                  console.warn(
                    "Database deletion blocked. Please close other tabs and refresh."
                  );
                  // Still resolve to allow retry
                  resolve();
                };
              });
            } catch (deleteError) {
              console.error("Failed to delete database:", deleteError);
            }
          }

          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Retry database creation
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
