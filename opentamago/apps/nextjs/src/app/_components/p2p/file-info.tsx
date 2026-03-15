"use client";

import { FileArchive, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

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
    <Card className="relative flex flex-col items-center gap-3 bg-muted/50 p-6 mx-auto max-w-sm">
      {showRemove && onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className="absolute top-2 right-2"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
        <FileArchive className="h-6 w-6 text-primary" />
      </div>
      <div className="text-center w-full min-w-0">
        <p className="truncate font-medium">{file.name}</p>
        <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
      </div>
    </Card>
  );
}
