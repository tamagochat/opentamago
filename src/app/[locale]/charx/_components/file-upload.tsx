"use client";

import { useCallback, useState, useEffect } from "react";
import { Upload, Plus, AlertCircle, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { RealmErrorCode } from "~/app/api/realm/download/route";

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  isLoading?: boolean;
  compact?: boolean;
}

// UUID v4 regex pattern
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * Parse RisuRealm UUID from various input formats:
 * 1. Full URL: https://realm.risuai.net/character/af884fd8-...
 * 2. Just UUID: CHARACTER_ID
 * 3. URL with query param: http://localhost:3000/charx?realm=af884fd8-...
 */
function parseRealmUUID(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try to extract UUID from the input
  const match = trimmed.match(UUID_REGEX);
  return match ? match[0].toLowerCase() : null;
}

class RealmDownloadError extends Error {
  code: RealmErrorCode;
  size?: string;
  constructor(code: RealmErrorCode, size?: string) {
    super(code);
    this.code = code;
    this.size = size;
  }
}

async function downloadFromRealm(uuid: string): Promise<File> {
  // Use our proxy API to avoid CORS issues
  const url = `/api/realm/download?id=${encodeURIComponent(uuid)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new RealmDownloadError(errorData.code ?? "DOWNLOAD_FAILED", errorData.size);
  }

  const blob = await response.blob();
  const filename = `${uuid}.charx`;
  return new File([blob], filename, { type: "application/octet-stream" });
}

export function FileUpload({
  onFilesSelect,
  isLoading,
  compact,
}: FileUploadProps) {
  const t = useTranslations("charx");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const validateAndSelectFiles = useCallback(
    (allFiles: File[]) => {
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      for (const file of allFiles) {
        if (file.name.toLowerCase().endsWith(".charx")) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      }

      if (invalidFiles.length > 0) {
        const names = invalidFiles.slice(0, 3).join(", ");
        const more = invalidFiles.length > 3 ? t("upload.andMore", { count: invalidFiles.length - 3 }) : "";
        const key = invalidFiles.length > 1 ? "upload.unsupportedFiles" : "upload.unsupportedFile";
        setError(t(key, { names: names + more }));
      }

      if (validFiles.length > 0) {
        onFilesSelect(validFiles);
      }
    },
    [onFilesSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        validateAndSelectFiles(files);
      }
    },
    [validateAndSelectFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        validateAndSelectFiles(Array.from(files));
      }
      e.target.value = "";
    },
    [validateAndSelectFiles]
  );

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "transition-colors cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          error && "border-destructive"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <label>
          <input
            type="file"
            accept=".charx"
            multiple
            className="hidden"
            onChange={handleFileInput}
            disabled={isLoading}
          />
          <CardContent className={cn("cursor-pointer", compact ? "p-4" : "p-8")}>
            <div
              className={cn(
                "flex items-center justify-center gap-4 text-center",
                compact ? "flex-row" : "flex-col"
              )}
            >
              <div className={cn("rounded-full bg-muted", compact ? "p-2" : "p-4")}>
                {compact ? (
                  <Plus className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className={compact ? "text-left" : ""}>
                <p className={cn("font-medium", compact && "text-sm")}>
                  {compact ? t("files.dropMore") : t("upload.dropFiles")}
                </p>
                {!compact && (
                  <p className="text-sm text-muted-foreground">
                    {t("upload.browseMultiple")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </label>
      </Card>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!compact && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 flex-shrink-0" />
          <span>
            {t.rich("upload.downloadLink", {
              link: (chunks) => (
                <a
                  href="https://realm.risuai.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  {chunks}
                </a>
              ),
            })}
          </span>
        </div>
      )}
    </div>
  );
}

export { parseRealmUUID, downloadFromRealm, RealmDownloadError };
