"use client";

import { useEffect, useState, useCallback } from "react";
import { useDatabase } from "./useDatabase";
import type { SettingsDocument } from "../schemas";
import { DEFAULT_MODEL, DEFAULT_SAFETY_SETTINGS } from "~/lib/ai";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

const DEFAULT_SETTINGS: SettingsDocument = {
  id: "default",
  apiMode: "client",
  defaultModel: DEFAULT_MODEL,
  temperature: 0.9,
  maxTokens: 4096,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
  updatedAt: Date.now(),
};

export function useSettings() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [settings, setSettings] = useState<SettingsDocument>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) return;

    const initSettings = async () => {
      let doc = await db.settings.findOne("default").exec();

      if (!doc) {
        try {
          // Try to insert, but handle conflicts gracefully
          await db.settings.insert(DEFAULT_SETTINGS);
          doc = await db.settings.findOne("default").exec();
        } catch (error: unknown) {
          // If insert fails due to conflict (document created by another instance),
          // just fetch the existing document
          if (error && typeof error === "object" && "code" in error && error.code === "CONFLICT") {
            console.warn("Settings insert conflict, fetching existing document");
            doc = await db.settings.findOne("default").exec();
          } else {
            // Re-throw other errors
            throw error;
          }
        }
      }

      if (doc) {
        // Merge with defaults to handle missing fields from older schema
        const stored = toMutable<SettingsDocument>(doc.toJSON());
        setSettings({
          ...DEFAULT_SETTINGS,
          ...stored,
          apiMode: stored.apiMode ?? DEFAULT_SETTINGS.apiMode,
          safetySettings: {
            ...DEFAULT_SAFETY_SETTINGS,
            ...stored.safetySettings,
          },
        });
      }
      setIsLoading(false);
    };

    void initSettings();

    const subscription = db.settings.findOne("default").$.subscribe((doc) => {
      if (doc) {
        const stored = toMutable<SettingsDocument>(doc.toJSON());
        setSettings({
          ...DEFAULT_SETTINGS,
          ...stored,
          apiMode: stored.apiMode ?? DEFAULT_SETTINGS.apiMode,
          safetySettings: {
            ...DEFAULT_SAFETY_SETTINGS,
            ...stored.safetySettings,
          },
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [db]);

  const updateSettings = useCallback(
    async (data: Partial<SettingsDocument>) => {
      if (!db) return null;

      // Always fetch fresh document to get latest revision
      let doc = await db.settings.findOne("default").exec();

      if (!doc) {
        try {
          // Try to insert with the new data
          await db.settings.insert({
            ...DEFAULT_SETTINGS,
            ...data,
            updatedAt: Date.now(),
          });
          doc = await db.settings.findOne("default").exec();
        } catch (error: unknown) {
          // If insert fails due to conflict, fetch and update instead
          if (error && typeof error === "object" && "code" in error && error.code === "CONFLICT") {
            console.warn("Settings insert conflict, fetching and updating existing document");
            doc = await db.settings.findOne("default").exec();
            if (doc) {
              await doc.patch({
                ...data,
                updatedAt: Date.now(),
              });
              // Re-fetch to get updated document
              doc = await db.settings.findOne("default").exec();
            }
          } else {
            // Re-throw other errors
            throw error;
          }
        }
      } else {
        // Use patch which handles revisions correctly
        await doc.patch({
          ...data,
          updatedAt: Date.now(),
        });
        // Re-fetch to get updated document with new revision
        doc = await db.settings.findOne("default").exec();
      }

      return doc ? toMutable<SettingsDocument>(doc.toJSON()) : null;
    },
    [db]
  );

  const hasApiKey = Boolean(settings.geminiApiKey);
  const isClientMode = settings.apiMode === "client";
  // When in client mode, require API key; when in server mode, always ready
  const isApiReady = isClientMode ? hasApiKey : true;
  // Get the effective API key to use (only in client mode)
  const effectiveApiKey = isClientMode ? settings.geminiApiKey : undefined;

  return {
    settings,
    isLoading: dbLoading || isLoading,
    updateSettings,
    hasApiKey,
    isClientMode,
    isApiReady,
    effectiveApiKey,
  };
}
