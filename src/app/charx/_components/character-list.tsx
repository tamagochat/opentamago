"use client";

import { useState, useCallback } from "react";
import {
  LayoutGrid,
  List,
  Loader2,
  FileArchive,
  AlertCircle,
  FolderOpen,
  Plus,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { ParsedCharX } from "~/lib/charx";
import { assetToDataUrl } from "~/lib/charx";

export interface CharacterItem {
  id: string;
  file: File;
  parsed: ParsedCharX | null;
  status: "pending" | "parsing" | "done" | "error";
  error?: string;
}

interface CharacterListProps {
  items: CharacterItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFilesSelect: (files: File[]) => void;
}

type ViewMode = "icon" | "list";

function getCharacterAvatar(item: CharacterItem): string | null {
  if (!item.parsed?.assets) return null;

  // First, try to get icon asset from card
  if (item.parsed.card) {
    const iconAsset = item.parsed.card.data.assets.find(
      (a) => a.type === "icon" && a.uri.startsWith("embeded://")
    );

    if (iconAsset) {
      const assetPath = iconAsset.uri.replace("embeded://", "");
      const assetData = item.parsed.assets.get(`assets/${assetPath}`);
      if (assetData) {
        return assetToDataUrl(assetData, assetPath);
      }
    }
  }

  // Fallback: get the first image asset
  for (const [path, data] of item.parsed.assets) {
    const ext = path.split(".").pop()?.toLowerCase();
    if (ext && ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
      return assetToDataUrl(data, path);
    }
  }

  return null;
}

function CharacterIconView({
  item,
  isSelected,
  onSelect,
}: {
  item: CharacterItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const avatar = getCharacterAvatar(item);
  const name = item.parsed?.card?.data.name ?? item.file.name.replace(".charx", "");

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/10"
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          "relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center",
          isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        {item.status === "parsing" ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : item.status === "error" ? (
          <AlertCircle className="h-6 w-6 text-destructive" />
        ) : avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <FileArchive className="h-6 w-6 text-muted-foreground" />
        )}
        {item.status === "pending" && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="text-xs text-muted-foreground">Queue</div>
          </div>
        )}
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p
              className={cn(
                "mt-1 text-xs text-center truncate w-full max-w-[80px]",
                isSelected && "font-medium text-primary"
              )}
            >
              {name}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p>{name}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function CharacterListView({
  item,
  isSelected,
  onSelect,
}: {
  item: CharacterItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const avatar = getCharacterAvatar(item);
  const name = item.parsed?.card?.data.name ?? item.file.name.replace(".charx", "");
  const creator = item.parsed?.card?.data.creator;
  const tags = item.parsed?.card?.data.tags ?? [];
  const lorebookCount = item.parsed?.card?.data.character_book?.entries.length;
  const assetsCount = item.parsed?.assets.size;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-primary/10"
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          "relative w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center",
          isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
        )}
      >
        {item.status === "parsing" ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : item.status === "error" ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : avatar ? (
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <FileArchive className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("font-medium text-sm truncate", isSelected && "text-primary")}>
            {name}
          </p>
          {item.status === "pending" && (
            <Badge variant="secondary" className="text-xs">
              Queued
            </Badge>
          )}
          {item.status === "error" && (
            <Badge variant="destructive" className="text-xs">
              Error
            </Badge>
          )}
        </div>
        {creator && (
          <p className="text-xs text-muted-foreground truncate">by {creator}</p>
        )}
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-right flex-shrink-0">
        <div>{(item.file.size / 1024 / 1024).toFixed(1)} MB</div>
        {item.status === "done" && (lorebookCount !== undefined || assetsCount !== undefined) && (
          <div className="text-[10px]">
            {lorebookCount !== undefined && lorebookCount > 0 && (
              <span>{lorebookCount} lore</span>
            )}
            {lorebookCount !== undefined && lorebookCount > 0 && assetsCount !== undefined && assetsCount > 0 && (
              <span> · </span>
            )}
            {assetsCount !== undefined && assetsCount > 0 && (
              <span>{assetsCount} assets</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CharacterList({
  items,
  selectedId,
  onSelect,
  onFilesSelect,
}: CharacterListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("icon");
  const [isDragging, setIsDragging] = useState(false);

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

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.toLowerCase().endsWith(".charx")
      );
      if (files.length > 0) {
        onFilesSelect(files);
      }
    },
    [onFilesSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFilesSelect(Array.from(files).filter((f) =>
          f.name.toLowerCase().endsWith(".charx")
        ));
      }
      e.target.value = "";
    },
    [onFilesSelect]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <Card
      className={cn(isDragging && "border-primary bg-primary/5")}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Files
            </CardTitle>
            <CardDescription>
              {items.length} files (.charx) loaded
              {items.some((i) => i.status === "parsing") && (
                <span className="ml-2 text-primary">
                  <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                  Parsing...
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button
              variant={viewMode === "icon" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("icon")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          {viewMode === "icon" ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {items.map((item) => (
                <CharacterIconView
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onSelect={() => onSelect(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <CharacterListView
                  key={item.id}
                  item={item}
                  isSelected={selectedId === item.id}
                  onSelect={() => onSelect(item.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <label className="mt-3 flex items-center gap-2 p-2 rounded-md border border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
          <input
            type="file"
            accept=".charx"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
          <Plus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Drop more .charx files or click to browse
          </span>
        </label>
      </CardContent>
    </Card>
  );
}
