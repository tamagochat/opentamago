"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Database, Trash2, HardDrive, Download, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { useDatabase } from "~/lib/db/hooks";
import { toast } from "sonner";

interface CollectionStats {
  name: string;
  count: number;
}

export function DatabaseTab() {
  const t = useTranslations("chat.settings.database");
  const tActions = useTranslations("actions");
  const { db } = useDatabase();
  const [stats, setStats] = useState<CollectionStats[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<{
    usage: number;
    quota: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Load database statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!db) return;

      setIsLoading(true);
      try {
        const collections: CollectionStats[] = [];

        // Get counts for each collection
        const charactersCount = await db.characters.count().exec();
        const personasCount = await db.personas.count().exec();
        const chatsCount = await db.chats.count().exec();
        const messagesCount = await db.messages.count().exec();
        const memoriesCount = await db.memories.count().exec();
        const settingsCount = await db.settings.count().exec();
        const lorebookCount = await db.lorebookEntries.count().exec();
        const assetsCount = await db.characterAssets.count().exec();

        collections.push(
          { name: "Characters", count: charactersCount },
          { name: "Personas", count: personasCount },
          { name: "Chats", count: chatsCount },
          { name: "Messages", count: messagesCount },
          { name: "Memories", count: memoriesCount },
          { name: "Settings", count: settingsCount },
          { name: "Lorebook Entries", count: lorebookCount },
          { name: "Character Assets", count: assetsCount }
        );

        setStats(collections);

        // Get storage estimate if available
        if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          setStorageEstimate({
            usage: estimate.usage || 0,
            quota: estimate.quota || 0,
          });
        }
      } catch (error) {
        console.error("Failed to load database stats:", error);
        toast.error("Failed to load database statistics");
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [db]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleResetDatabase = async () => {
    if (!db) return;

    const confirmed = confirm(
      "Are you sure you want to reset the database? This will delete ALL data including characters, chats, messages, and settings. This action cannot be undone."
    );

    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirm = confirm(
      "This is your last warning! All data will be permanently deleted. Type YES to confirm."
    );

    if (!doubleConfirm) return;

    setIsResetting(true);
    try {
      // Close the database first
      await db.remove();

      toast.success("Database reset successfully. Please refresh the page.");

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Failed to reset database:", error);
      toast.error("Failed to reset database. Please try refreshing the page.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleExportData = async () => {
    if (!db) return;

    toast.info("Export feature coming soon!");
    // TODO: Implement data export functionality
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading database statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-medium mb-1 flex items-center gap-2">
          <Database className="h-4 w-4" />
          {t("title")}
        </h3>
        <p className="text-muted-foreground text-xs">{t("description")}</p>
      </div>

      {/* Storage Usage */}
      {storageEstimate && (
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <h4 className="font-medium text-sm">{t("storageUsage")}</h4>
              <p className="text-xs text-muted-foreground">
                {formatBytes(storageEstimate.usage)} / {formatBytes(storageEstimate.quota)}
              </p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all"
              style={{
                width: `${Math.min((storageEstimate.usage / storageEstimate.quota) * 100, 100)}%`,
              }}
            />
          </div>
        </Card>
      )}

      {/* Collection Statistics */}
      <Card className="p-4">
        <h4 className="font-medium text-sm mb-3">{t("collections")}</h4>
        <div className="space-y-2">
          {stats.map((collection) => (
            <div
              key={collection.name}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <span className="text-sm">{collection.name}</span>
              <span className="text-sm font-mono text-muted-foreground">
                {collection.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm">{t("actions")}</h4>

        {/* Export Data */}
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleExportData}
        >
          <Download className="h-4 w-4 mr-2" />
          {t("exportData")}
        </Button>

        {/* Reset Database */}
        <Alert variant="destructive" className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("dangerZone")}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">{t("resetWarning")}</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleResetDatabase}
              disabled={isResetting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isResetting ? t("resetting") : t("resetDatabase")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
