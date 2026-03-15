"use client";

import { useMemo, useCallback, memo } from "react";
import {
  Folder,
  FolderOpen,
  Plus,
  Settings,
  Inbox,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import type { CollectionDocument } from "~/lib/db/schemas/collection";
import type { CharacterDocument } from "~/lib/db/schemas/character";

// Dynamic icon mapping for collection icons
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  folder: Folder,
  star: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  heart: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  bookmark: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  ),
  flag: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  ),
  tag: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  ),
  crown: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  ),
  sparkles: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  ),
  flame: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  zap: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

interface CollectionFilterProps {
  collections: CollectionDocument[];
  characters: CharacterDocument[];
  selectedCollectionId: string | null;
  onSelectCollection: (id: string | null) => void;
  onManageCollections: () => void;
  onCreateCollection: () => void;
}

export const CollectionFilter = memo(function CollectionFilter({
  collections,
  characters,
  selectedCollectionId,
  onSelectCollection,
  onManageCollections,
  onCreateCollection,
}: CollectionFilterProps) {
  const t = useTranslations("pokebox.collections");

  // Calculate character counts for each collection
  const characterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const collectionIds = new Set(collections.map((c) => c.id));

    let uncategorizedCount = 0;
    for (const character of characters) {
      if (character.collectionId && collectionIds.has(character.collectionId)) {
        counts[character.collectionId] = (counts[character.collectionId] || 0) + 1;
      } else {
        uncategorizedCount++;
      }
    }
    counts["__uncategorized__"] = uncategorizedCount;
    counts["__all__"] = characters.length;

    return counts;
  }, [collections, characters]);

  const getIcon = useCallback((iconName: string) => {
    const IconComponent = ICON_MAP[iconName] || Folder;
    return IconComponent;
  }, []);

  return (
    <div className="flex items-center gap-1.5 mb-2">
      <ScrollArea className="flex-1 whitespace-nowrap">
        <div className="flex gap-1 pb-1.5">
          {/* All Characters button */}
          <Button
            variant={selectedCollectionId === null ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 flex-shrink-0 text-xs"
            onClick={() => onSelectCollection(null)}
          >
            <FolderOpen className="h-3 w-3 mr-1" />
            {t("all")}
            <Badge
              variant={selectedCollectionId === null ? "secondary" : "outline"}
              className="ml-1 h-4 px-1 text-[9px]"
            >
              {characterCounts["__all__"] || 0}
            </Badge>
          </Button>

          {/* Uncategorized button (only show if there are uncategorized characters) */}
          {(characterCounts["__uncategorized__"] ?? 0) > 0 && (
            <Button
              variant={selectedCollectionId === "__uncategorized__" ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 flex-shrink-0 text-xs"
              onClick={() => onSelectCollection("__uncategorized__")}
            >
              <Inbox className="h-3 w-3 mr-1" />
              {t("uncategorized")}
              <Badge
                variant={selectedCollectionId === "__uncategorized__" ? "secondary" : "outline"}
                className="ml-1 h-4 px-1 text-[9px]"
              >
                {characterCounts["__uncategorized__"]}
              </Badge>
            </Button>
          )}

          {/* Collection buttons */}
          {collections.map((collection) => {
            const IconComponent = getIcon(collection.icon);
            const isSelected = selectedCollectionId === collection.id;
            const count = characterCounts[collection.id] || 0;

            return (
              <Button
                key={collection.id}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={cn(
                  "h-7 px-2 flex-shrink-0 text-xs",
                  !isSelected && "hover:border-current"
                )}
                style={{
                  borderColor: isSelected ? undefined : collection.color,
                  color: isSelected ? undefined : collection.color,
                }}
                onClick={() => onSelectCollection(collection.id)}
              >
                <IconComponent className="h-3 w-3 mr-1" />
                {collection.name}
                <Badge
                  variant={isSelected ? "secondary" : "outline"}
                  className="ml-1 h-4 px-1 text-[9px]"
                  style={{
                    borderColor: isSelected ? undefined : collection.color,
                  }}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}

          {/* Add Collection button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 flex-shrink-0 text-muted-foreground"
            onClick={onCreateCollection}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Manage Collections button */}
      {collections.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 flex-shrink-0"
          onClick={onManageCollections}
        >
          <Settings className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
});
