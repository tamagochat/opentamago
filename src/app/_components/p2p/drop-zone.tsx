"use client";

import { useCallback, useState, useRef } from "react";
import { Upload } from "lucide-react";
import { cn } from "~/lib/utils";
import { Card } from "~/components/ui/card";

const isDev = process.env.NODE_ENV === "development";
const ACCEPTED_EXTENSIONS = isDev
  ? [".charx", ".json", ".txt"]
  : [".charx"];
const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(",");

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  className?: string;
  translations?: {
    dropHere?: string;
    dropToShare?: string;
    orClickToBrowse?: string;
  };
}

export function DropZone({
  onFileSelect,
  accept = ACCEPT_STRING,
  className,
  translations,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const isValidFile = useCallback((fileName: string) => {
    return ACCEPTED_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file && isValidFile(file.name)) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect, isValidFile]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect]
  );

  return (
    <Card
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center border-2 border-dashed p-8 transition-all",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className={cn(
            "rounded-full p-4 transition-colors",
            isDragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          <Upload className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragging
              ? (translations?.dropHere ?? "Drop your file here")
              : (translations?.dropToShare ?? `Drop a ${ACCEPTED_EXTENSIONS.join(", ")} file to share`)}
          </p>
          <p className="text-sm text-muted-foreground">
            {translations?.orClickToBrowse ?? "or click to browse"}
          </p>
          {isDev && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Dev mode: .json and .txt files are also allowed
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
