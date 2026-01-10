"use client";

import { useEffect, useState, useCallback } from "react";
import { useDatabase } from "./useDatabase";
import type { ProviderSettingsDocument } from "../schemas";
import {
  ALL_PROVIDERS,
  PROVIDER_CONFIGS,
  type Provider,
} from "~/lib/ai/providers";

// Helper to convert RxDB's DeepReadonlyObject to mutable
function toMutable<T>(obj: unknown): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Hook for managing provider settings (API keys and credentials).
 * Each provider has its own document in the providerSettings collection.
 * Generation settings (model, temperature, etc.) are stored in generationSettings.
 */
export function useProviderSettings() {
  const { db, isLoading: dbLoading } = useDatabase();
  const [providers, setProviders] = useState<
    Map<Provider, ProviderSettingsDocument>
  >(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize default provider settings if they don't exist
  useEffect(() => {
    if (!db) return;

    const initProviders = async () => {
      for (const providerId of ALL_PROVIDERS) {
        try {
          const existing = await db.providerSettings.findOne(providerId).exec();
          if (!existing) {
            await db.providerSettings.insert({
              id: providerId,
              enabled: false,
              updatedAt: Date.now(),
            });
          }
        } catch (error: unknown) {
          // Handle conflicts gracefully (document created by another instance)
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "CONFLICT"
          ) {
            console.warn(
              `Provider settings insert conflict for ${providerId}, skipping`
            );
          } else {
            console.error(
              `Error initializing provider settings for ${providerId}:`,
              error
            );
          }
        }
      }
      setIsLoading(false);
    };

    void initProviders();

    // Subscribe to all provider settings
    const subscription = db.providerSettings.find().$.subscribe((docs) => {
      const map = new Map<Provider, ProviderSettingsDocument>();
      docs.forEach((doc) => {
        const data = toMutable<ProviderSettingsDocument>(doc.toJSON());
        if (ALL_PROVIDERS.includes(data.id as Provider)) {
          map.set(data.id as Provider, data);
        }
      });
      setProviders(map);
    });

    return () => subscription.unsubscribe();
  }, [db]);

  /**
   * Get settings for a specific provider
   */
  const getProviderSettings = useCallback(
    (providerId: Provider): ProviderSettingsDocument | undefined => {
      return providers.get(providerId);
    },
    [providers]
  );

  /**
   * Update settings for a specific provider
   */
  const updateProviderSettings = useCallback(
    async (
      providerId: Provider,
      data: Partial<Omit<ProviderSettingsDocument, "id">>
    ) => {
      if (!db) return null;

      const doc = await db.providerSettings.findOne(providerId).exec();
      if (!doc) {
        // Create if doesn't exist
        await db.providerSettings.insert({
          id: providerId,
          enabled: data.enabled ?? false,
          apiKey: data.apiKey,
          baseUrl: data.baseUrl,
          updatedAt: Date.now(),
        });
        return db.providerSettings.findOne(providerId).exec().then((d) =>
          d ? toMutable<ProviderSettingsDocument>(d.toJSON()) : null
        );
      }

      await doc.patch({
        ...data,
        updatedAt: Date.now(),
      });

      return toMutable<ProviderSettingsDocument>(doc.toJSON());
    },
    [db]
  );

  /**
   * Set API key for a specific provider
   */
  const setApiKey = useCallback(
    async (providerId: Provider, apiKey: string) => {
      return updateProviderSettings(providerId, {
        apiKey,
        enabled: !!apiKey,
      });
    },
    [updateProviderSettings]
  );

  /**
   * Check if a provider is ready (has API key if required)
   */
  const isProviderReady = useCallback(
    (providerId: Provider): boolean => {
      const settings = providers.get(providerId);
      if (!settings) return false;
      const config = PROVIDER_CONFIGS[providerId];
      return config.requiresApiKey ? !!settings.apiKey : true;
    },
    [providers]
  );

  /**
   * Get all configured providers (those with API keys)
   */
  const getConfiguredProviders = useCallback((): Provider[] => {
    return ALL_PROVIDERS.filter((providerId) => isProviderReady(providerId));
  }, [isProviderReady]);

  return {
    providers,
    isLoading: dbLoading || isLoading,
    getProviderSettings,
    updateProviderSettings,
    setApiKey,
    isProviderReady,
    getConfiguredProviders,
  };
}
