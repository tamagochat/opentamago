"use client";

import { FileArchive, X } from "lucide-react";
import { Button } from "~/components/ui/button";

interface FileInfoProps {
  file: File;
  onRemove?: () => void;
  showRemove?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function FileInfo({ file, onRemove, showRemove = true }: FileInfoProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
        <FileArchive className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
