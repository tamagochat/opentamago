"use client";

import { useCallback, useState, useEffect } from "react";
import { Upload, Plus, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  isLoading?: boolean;
  compact?: boolean;
}

export function FileUpload({
  onFilesSelect,
  isLoading,
  compact,
}: FileUploadProps) {
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
        const more = invalidFiles.length > 3 ? ` and ${invalidFiles.length - 3} more` : "";
        setError(`Unsupported file${invalidFiles.length > 1 ? "s" : ""}: ${names}${more}. Only .charx files are supported.`);
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
    <div className="space-y-2">
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
                  {compact ? "Drop more .charx files or click to browse" : "Drop your .charx files here"}
                </p>
                {!compact && (
                  <p className="text-sm text-muted-foreground">
                    or click to browse files (multiple selection supported)
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
    </div>
  );
}
