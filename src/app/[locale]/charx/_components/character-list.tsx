"use client";

import { useState, useCallback } from "react";
import {
  Loader2,
  FileArchive,
  AlertCircle,
  FolderOpen,
  Plus,
  Share2,
  Save,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { assetToDataUrl } from "~/lib/charx";
import type { CharacterItem } from "~/lib/stores";
import { RealmDownloader } from "./realm-downloader";

interface CharacterListProps {
  items: CharacterItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFilesSelect: (files: File[]) => void;
  onShareP2P: (item: CharacterItem) => void;
  onSaveToDatabase: (item: CharacterItem) => void;
  onDelete: (id: string) => void;
}

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

function CharacterCard({
  item,
  isSelected,
  onSelect,
  onShareP2P,
  onSaveToDatabase,
  onDelete,
}: {
  item: CharacterItem;
  isSelected: boolean;
  onSelect: () => void;
  onShareP2P: () => void;
  onSaveToDatabase: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("charx");
  const avatar = getCharacterAvatar(item);
  const name =
    item.parsed?.card?.data.name ?? item.file.name.replace(".charx", "");
  const creator = item.parsed?.card?.data.creator;
  const tags = item.parsed?.card?.data.tags ?? [];
  const lorebookCount = item.parsed?.card?.data.character_book?.entries.length;
  const assetsCount = item.parsed?.assets.size;
  const isDone = item.status === "done";
  const hasCard = item.parsed?.card;

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer overflow-hidden",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={onSelect}
    >
      {/* Avatar/Cover */}
      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {item.status === "parsing" ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {t("files.parsing")}
            </span>
          </div>
        ) : item.status === "error" ? (
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <span className="text-xs text-destructive line-clamp-2">
              {item.error || t("error")}
            </span>
          </div>
        ) : item.status === "pending" ? (
          <div className="flex flex-col items-center gap-2">
            <FileArchive className="h-8 w-8 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {t("files.queued")}
            </span>
          </div>
        ) : avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileArchive className="h-12 w-12 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2 w-full overflow-hidden">
        {/* Name and Creator */}
        <div className="min-w-0 w-full overflow-hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="font-semibold text-sm truncate min-w-0">{name}</h3>
              </TooltipTrigger>
              <TooltipContent>
                <p>{name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {creator && (
            <p className="text-xs text-muted-foreground truncate min-w-0">
              {t("character.byCreator", { creator })}
            </p>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap w-full overflow-hidden">
            {tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 truncate max-w-[80px]"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        {isDone && (lorebookCount || assetsCount) && (
          <div className="flex gap-2 text-[10px] text-muted-foreground w-full overflow-hidden">
            {lorebookCount !== undefined && lorebookCount > 0 && (
              <span className="truncate">{t("character.loreCount", { count: lorebookCount })}</span>
            )}
            {assetsCount !== undefined && assetsCount > 0 && (
              <span className="truncate">{t("character.assetsCount", { count: assetsCount })}</span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1.5 pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  disabled={!isDone || !hasCard}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShareP2P();
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("shareP2P")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  disabled={!isDone || !hasCard}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveToDatabase();
                  }}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("export.button")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("files.delete")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export function CharacterList({
  items,
  selectedId,
  onSelect,
  onFilesSelect,
  onShareP2P,
  onSaveToDatabase,
  onDelete,
}: CharacterListProps) {
  const t = useTranslations("charx");
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
        onFilesSelect(
          Array.from(files).filter((f) =>
            f.name.toLowerCase().endsWith(".charx")
          )
        );
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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {t("files.title")}
            </CardTitle>
            <CardDescription>
              {t("files.loaded", { count: items.length })}
              {items.some((i) => i.status === "parsing") && (
                <span className="ml-2 text-primary">
                  <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                  {t("files.parsing")}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <CharacterCard
              key={item.id}
              item={item}
              isSelected={selectedId === item.id}
              onSelect={() => onSelect(item.id)}
              onShareP2P={() => onShareP2P(item)}
              onSaveToDatabase={() => onSaveToDatabase(item)}
              onDelete={() => onDelete(item.id)}
            />
          ))}

          {/* Add More Card */}
          <label
            className={cn(
              "relative rounded-xl border-2 border-dashed bg-muted/30 cursor-pointer transition-colors",
              "hover:bg-muted/50 hover:border-muted-foreground/30",
              "flex flex-col items-center justify-center min-h-[200px]"
            )}
          >
            <input
              type="file"
              accept=".charx"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground text-center px-2">
              {t("files.dropMore")}
            </span>
          </label>
        </div>

        {/* Realm ID Input */}
        <div className="mt-4 space-y-2">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-muted" />
            <span className="px-3 text-xs text-muted-foreground uppercase">
              {t("upload.or")}
            </span>
            <div className="flex-grow border-t border-muted" />
          </div>

          <RealmDownloader onFilesSelect={onFilesSelect} compact />
        </div>
      </CardContent>
    </Card>
  );
}
