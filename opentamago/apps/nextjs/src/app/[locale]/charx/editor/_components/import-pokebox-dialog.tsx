"use client";

import { useState, useMemo } from "react";
import { Search, User, FolderHeart } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import type { CharacterDocument } from "~/lib/db/schemas";

interface ImportPokeboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characters: CharacterDocument[];
  onSelect: (characterId: string) => void;
  isLoading: boolean;
}

export function ImportPokeboxDialog({
  open,
  onOpenChange,
  characters,
  onSelect,
  isLoading,
}: ImportPokeboxDialogProps) {
  const t = useTranslations("charxEditor.import");
  const [search, setSearch] = useState("");

  const filteredCharacters = useMemo(() => {
    if (!search.trim()) return characters;
    const lowerSearch = search.toLowerCase();
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.tags?.some((tag) => tag.toLowerCase().includes(lowerSearch))
    );
  }, [characters, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderHeart className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="pl-9"
          />
        </div>

        {/* Character List */}
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <FolderHeart className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t("empty")}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {t("emptyHint")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => onSelect(character.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {character.avatarData ? (
                      <img
                        src={character.avatarData}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{character.name}</p>
                    {character.creator && (
                      <p className="text-sm text-muted-foreground truncate">
                        by {character.creator}
                      </p>
                    )}
                    {character.tags && character.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {character.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {character.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{character.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Select Button */}
                  <Button variant="ghost" size="sm">
                    {t("select")}
                  </Button>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
