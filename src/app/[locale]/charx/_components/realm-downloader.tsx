"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { Download, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { parseRealmUUID, downloadFromRealm, RealmDownloadError } from "./file-upload";

// Demo example URLs from RisuRealm
const DEMO_URLS = [
  "https://realm.risuai.net/character/5b4b6887-13c6-41be-9994-0d35e84fd968",
];

interface RealmDownloaderProps {
  onFilesSelect: (files: File[]) => void;
  initialRealmId?: string;
  onInitialDownloadTriggered?: () => void;
  compact?: boolean;
}

export function RealmDownloader({
  onFilesSelect,
  initialRealmId,
  onInitialDownloadTriggered,
  compact,
}: RealmDownloaderProps) {
  const t = useTranslations("charx");
  const [realmInput, setRealmInput] = useState(initialRealmId ?? "");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const initialDownloadTriggered = useRef(false);

  const handleRealmDownload = useCallback(async () => {
    const uuid = parseRealmUUID(realmInput);
    if (!uuid) {
      toast.error(t("upload.realmError.INVALID_UUID"));
      return;
    }

    setIsDownloading(true);

    try {
      const file = await downloadFromRealm(uuid);
      onFilesSelect([file]);
      setRealmInput("");
      toast.success(t("upload.realmDownloadSuccess"));
    } catch (e) {
      console.error("Failed to download from Realm:", e);
      if (e instanceof RealmDownloadError) {
        toast.error(t(`upload.realmError.${e.code}`, { size: e.size ?? "" }));
      } else {
        toast.error(t("upload.realmError.DOWNLOAD_FAILED"));
      }
    } finally {
      setIsDownloading(false);
    }
  }, [realmInput, onFilesSelect, t]);

  // Auto-trigger download if initialRealmId is provided
  useEffect(() => {
    if (initialRealmId && !initialDownloadTriggered.current) {
      initialDownloadTriggered.current = true;
      onInitialDownloadTriggered?.();
      void handleRealmDownload();
    }
  }, [initialRealmId, handleRealmDownload, onInitialDownloadTriggered]);

  const handleRealmInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isDownloading) {
        void handleRealmDownload();
      }
    },
    [handleRealmDownload, isDownloading]
  );

  const handleDemoDownload = useCallback(async () => {
    const randomUrl = DEMO_URLS[Math.floor(Math.random() * DEMO_URLS.length)];
    const uuid = parseRealmUUID(randomUrl ?? "");
    if (!uuid) return;

    setIsDemoLoading(true);

    try {
      const file = await downloadFromRealm(uuid);
      onFilesSelect([file]);
      toast.success(t("upload.realmDownloadSuccess"));
    } catch (e) {
      console.error("Failed to download demo:", e);
      if (e instanceof RealmDownloadError) {
        toast.error(t(`upload.realmError.${e.code}`, { size: e.size ?? "" }));
      } else {
        toast.error(t("upload.realmError.DOWNLOAD_FAILED"));
      }
    } finally {
      setIsDemoLoading(false);
    }
  }, [onFilesSelect, t]);

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={t("upload.realmPlaceholder")}
          value={realmInput}
          onChange={(e) => setRealmInput(e.target.value)}
          onKeyDown={handleRealmInputKeyDown}
          disabled={isDownloading}
          className="flex-1"
        />
        <Button
          onClick={handleRealmDownload}
          disabled={isDownloading || !realmInput.trim()}
          className="gap-2"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {t("upload.realmDownload")}
        </Button>
      </div>

      {!compact && (
        <>
          <p className="text-xs text-muted-foreground">
            {t("upload.realmHint")}
          </p>

          {/* Demo Section */}
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-muted" />
            <span className="px-3 text-xs text-muted-foreground uppercase">
              {t("upload.or")}
            </span>
            <div className="flex-grow border-t border-muted" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDemoDownload}
              disabled={isDemoLoading}
              className="gap-2"
            >
              {isDemoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {t("upload.tryDemo")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("upload.demoHint")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
