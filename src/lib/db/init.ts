import {
  addRxPlugin,
  createRxDatabase,
  removeRxDatabase,
  type RxDatabase,
  type RxStorage,
} from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";
import { RxDBUpdatePlugin } from "rxdb/plugins/update";
import { RxDBMigrationSchemaPlugin } from "rxdb/plugins/migration-schema";
import { RxDBAttachmentsPlugin } from "rxdb/plugins/attachments";
import { wrappedValidateAjvStorage } from "rxdb/plugins/validate-ajv";
import type { DatabaseCollections } from "./types";
import { getCollectionConfig } from "./collections";

const isDev = process.env.NODE_ENV === "development";

// Global cache for Next.js HMR - survives module reloads
declare global {
  var __rxdb_storage: RxStorage<any, any> | undefined;
  var __rxdb_instance: RxDatabase<DatabaseCollections> | undefined;
  var __rxdb_plugins_added: boolean | undefined;
}

// Add core plugins (only once globally)
function addCorePlugins() {
  if (globalThis.__rxdb_plugins_added) return;

  addRxPlugin(RxDBQueryBuilderPlugin);
  addRxPlugin(RxDBUpdatePlugin);
  addRxPlugin(RxDBMigrationSchemaPlugin);
  addRxPlugin(RxDBAttachmentsPlugin);

  globalThis.__rxdb_plugins_added = true;
}

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

// Get or create singleton storage instance (survives HMR)
function getStorage(): RxStorage<any, any> {
  if (globalThis.__rxdb_storage) {
    return globalThis.__rxdb_storage;
  }

  const baseStorage = getRxStorageDexie();

  const storage = isDev
    ? wrappedValidateAjvStorage({ storage: baseStorage })
    : baseStorage;

  // Cache globally to survive HMR
  globalThis.__rxdb_storage = storage;
  return storage;
}

// Delete all IndexedDB databases for this app
async function deleteAllDatabases() {
  if (isDev) console.log("[RxDB] Deleting all databases...");

  if (typeof window === "undefined" || !window.indexedDB) {
    return;
  }

  try {
    // Remove from RxDB's global registry
    try {
      await removeRxDatabase("opentamago", getStorage());
      if (isDev) console.log("[RxDB] Removed database from RxDB registry");
    } catch (removeError) {
      if (isDev) console.log("[RxDB] Database not in registry or already removed");
    }

    // Wait for registry cleanup
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Delete all IndexedDB databases
    const databases = (await window.indexedDB.databases?.()) ?? [];

    for (const dbInfo of databases) {
      if (dbInfo.name?.includes("opentamago") || dbInfo.name?.includes("rxdb")) {
        await new Promise<void>((resolve) => {
          const deleteReq = window.indexedDB.deleteDatabase(dbInfo.name!);
          deleteReq.onsuccess = () => {
            if (isDev) console.log(`[RxDB] Deleted IndexedDB: ${dbInfo.name}`);
            resolve();
          };
          deleteReq.onerror = () => resolve();
          deleteReq.onblocked = () => resolve();
        });
      }
    }

    // Clear global cache
    globalThis.__rxdb_instance = undefined;

    if (isDev) console.log("[RxDB] All databases deleted successfully");
  } catch (error) {
    console.error("[RxDB] Error deleting databases:", error);
  }
}

// Create the database instance
async function createDatabase(): Promise<RxDatabase<DatabaseCollections>> {
  if (isDev) console.log("[RxDB] Creating database instance...");

  const db = await createRxDatabase<DatabaseCollections>({
    name: "opentamago",
    storage: getStorage(),
    multiInstance: false,
    eventReduce: true,
    ignoreDuplicate: false, // We want to catch duplicates
  });

  if (isDev) console.log("[RxDB] Database instance created");
  return db;
}

// Add collections to the database
async function addCollections(db: RxDatabase<DatabaseCollections>) {
  if (isDev) console.log("[RxDB] Adding collections...");

  // Check if collections already exist
  const existingCollections = Object.keys(db.collections);
  if (existingCollections.length > 0) {
    if (isDev) {
      console.log(
        `[RxDB] Collections already exist (${existingCollections.length}), skipping`
      );
    }
    return;
  }

  const collectionConfig = getCollectionConfig();
  await db.addCollections(collectionConfig);

  if (isDev) {
    console.log(
      `[RxDB] Added ${Object.keys(collectionConfig).length} collections successfully`
    );
  }
}

// Main initialization function
export async function initializeDatabase(): Promise<
  RxDatabase<DatabaseCollections>
> {
  // Browser-only check
  if (typeof window === "undefined") {
    throw new Error(
      "[RxDB] Database can only be initialized in browser environment"
    );
  }

  // Return cached instance if available (survives HMR)
  if (globalThis.__rxdb_instance) {
    if (isDev) console.log("[RxDB] Returning cached database instance");
    return globalThis.__rxdb_instance;
  }

  if (isDev) console.log("[RxDB] Starting database initialization");

  try {
    // Add plugins first
    addCorePlugins();
    await loadDevMode();

    // Create database
    const db = await createDatabase();

    // Add collections
    await addCollections(db);

    // Cache globally (survives HMR)
    globalThis.__rxdb_instance = db;

    if (isDev) console.log("[RxDB] Initialization complete");
    return db;
  } catch (error: any) {
    console.error("[RxDB] Initialization error:", {
      code: error?.code,
      message: error?.message,
      name: error?.name,
      parameters: error?.parameters,
    });

    // Check for database name conflict (DB9)
    const isDatabaseNameError =
      error?.code === "DB9" ||
      error?.message?.includes("database name already used");

    // Check for schema/collection errors
    const isSchemaError =
      error?.code === "DB6" ||
      error?.code === "COL12" ||
      error?.code === "COL23" ||
      error?.message?.includes("different schema") ||
      error?.message?.includes("migrationStrategy") ||
      error?.message?.includes("amount of collections");

    // Auto-recovery: delete and retry (with user confirmation)
    if (isDatabaseNameError || isSchemaError) {
      const reason = isDatabaseNameError
        ? "Database name conflict"
        : "Schema conflict";

      console.warn(`[RxDB] ${reason} detected. User confirmation required for reset.`);

      const confirmed = window.confirm(
        `${reason} detected.\n\n` +
          "Your local database needs to be reset to fix this issue. " +
          "All local data (characters, chats, settings) will be lost.\n\n" +
          "We're working on data export and automatic conflict resolution.\n\n" +
          "Click OK to reset the database, or Cancel to stop loading."
      );

      if (!confirmed) {
        throw new Error(
          `[RxDB] Database reset declined by user. Please refresh the page to try again, ` +
            `or clear your browser data manually if the issue persists.`
        );
      }

      console.warn(`[RxDB] User confirmed database reset.`);
      await deleteAllDatabases();

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Retry once
      if (isDev) console.log("[RxDB] Retrying initialization...");
      const db = await createDatabase();
      await addCollections(db);

      globalThis.__rxdb_instance = db;
      if (isDev) console.log("[RxDB] Initialization complete after retry");

      return db;
    }

    throw error;
  }
}

// Export for cleanup/testing
export function resetDatabase() {
  globalThis.__rxdb_instance = undefined;
  globalThis.__rxdb_storage = undefined;
  globalThis.__rxdb_plugins_added = undefined;
}
