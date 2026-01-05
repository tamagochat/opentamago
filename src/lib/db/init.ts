import {
  addRxPlugin,
  createRxDatabase,
  type RxDatabase,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { RxDBAttachmentsPlugin } from "rxdb/plugins/attachments";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import type { DatabaseCollections } from "./types";
import { getCollectionConfig } from "./collections";

// Add core plugins (only once)
let pluginsAdded = false;
function addCorePlugins() {
  if (pluginsAdded) return;

  addRxPlugin(RxDBQueryBuilderPlugin);
  addRxPlugin(RxDBUpdatePlugin);
  addRxPlugin(RxDBMigrationSchemaPlugin);
  addRxPlugin(RxDBAttachmentsPlugin);

  pluginsAdded = true;
}

const isDev = process.env.NODE_ENV === "development";

// Singleton instance management
let dbInstance: RxDatabase<DatabaseCollections> | null = null;
let dbPromise: Promise<RxDatabase<DatabaseCollections>> | null = null;
let initializationAttempts = 0;
const MAX_ATTEMPTS = 2;

// Load dev mode plugin
async function loadDevMode() {
  if (!isDev) return;

  try {
    const { RxDBDevModePlugin, disableWarnings } = await import(
      "rxdb/plugins/dev-mode"
    );
    addRxPlugin(RxDBDevModePlugin);
    disableWarnings();
    console.log("[RxDB] Dev mode plugin loaded");
  } catch (error) {
    console.warn("[RxDB] Failed to load dev mode plugin:", error);
  }
}

// Get storage with optional validation
function getStorage() {
  const baseStorage = getRxStorageDexie();

  if (isDev) {
    return wrappedValidateAjvStorage({ storage: baseStorage });
  }

  return baseStorage;
}

// Delete all IndexedDB databases for this app
async function deleteAllDatabases() {
  console.log("[RxDB] Deleting all databases...");

  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  try {
    const databases = (await window.indexedDB.databases?.()) ?? [];

    for (const dbInfo of databases) {
      if (dbInfo.name?.includes("opentamago") || dbInfo.name?.includes("rxdb")) {
        await new Promise<void>((resolve) => {
          const deleteReq = window.indexedDB.deleteDatabase(dbInfo.name!);
          deleteReq.onsuccess = () => {
            console.log(`[RxDB] Deleted database: ${dbInfo.name}`);
            resolve();
          };
          deleteReq.onerror = () => resolve();
          deleteReq.onblocked = () => resolve();
        });
      }
    }
  } catch (error) {
    console.error("[RxDB] Error deleting databases:", error);
  }
}

// Create the database instance
async function createDatabase(): Promise<RxDatabase<DatabaseCollections>> {
  console.log("[RxDB] Creating database instance...");

  const db = await createRxDatabase<DatabaseCollections>({
    name: "opentamago",
    storage: getStorage(),
    multiInstance: false,
    eventReduce: true,
    ignoreDuplicate: true,
  });

  console.log("[RxDB] Database instance created");
  return db;
}

// Add collections to the database
async function addCollections(db: RxDatabase<DatabaseCollections>) {
  console.log("[RxDB] Adding collections...");

  // Check if collections already exist
  const existingCollections = Object.keys(db.collections);
  if (existingCollections.length > 0) {
    console.log(
      `[RxDB] Collections already exist (${existingCollections.length}), skipping`
    );
    return;
  }

  const collectionConfig = getCollectionConfig();
  await db.addCollections(collectionConfig);

  console.log(
    `[RxDB] Added ${Object.keys(collectionConfig).length} collections successfully`
  );
}

// Main initialization function
export async function initializeDatabase(): Promise<
  RxDatabase<DatabaseCollections>
> {
  // Return existing instance if available
  if (dbInstance) {
    console.log("[RxDB] Returning existing database instance");
    return dbInstance;
  }

  // Wait for existing initialization if in progress
  if (dbPromise) {
    console.log("[RxDB] Waiting for ongoing initialization...");
    return dbPromise;
  }

  // Start new initialization
  console.log("[RxDB] Starting database initialization");
  initializationAttempts++;

  dbPromise = (async () => {
    try {
      // Add plugins first
      addCorePlugins();
      await loadDevMode();

      // Create database
      const db = await createDatabase();

      // Add collections
      await addCollections(db);

      // Store instance
      dbInstance = db;
      console.log("[RxDB] Initialization complete");

      return db;
    } catch (error: any) {
      console.error("[RxDB] Initialization error:", error);

      // Check for collection limit error (COL23) or schema errors
      const isCollectionLimitError =
        error?.code === "COL23" ||
        error?.message?.includes("COL23") ||
        error?.message?.includes("amount of collections that can exist");

      const isSchemaError =
        error?.code === "DB6" ||
        error?.code === "COL12" ||
        error?.message?.includes("different schema") ||
        error?.message?.includes("migrationStrategy");

      // Auto-recovery: delete and retry once
      if (
        (isCollectionLimitError || isSchemaError) &&
        initializationAttempts < MAX_ATTEMPTS
      ) {
        const reason = isCollectionLimitError
          ? "Collection limit exceeded"
          : "Schema mismatch";

        console.warn(
          `[RxDB] ${reason} detected. Deleting database and retrying...`
        );

        // Clean up
        dbInstance = null;
        dbPromise = null;

        // Delete all databases
        await deleteAllDatabases();

        // Wait a bit for cleanup
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Retry initialization
        return initializeDatabase();
      }

      // Reset state on error
      dbInstance = null;
      dbPromise = null;

      throw error;
    }
  })();

  return dbPromise;
}

// Export for cleanup/testing
export function resetDatabase() {
  dbInstance = null;
  dbPromise = null;
  initializationAttempts = 0;
}
