"use client";

import { useState } from "react";
import {
  Loader2,
  FolderHeart,
  Trash2,
  Search,
  FileArchive,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Card,
  CardContent,
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { Link } from "~/i18n/routing";
import type { CharacterDocument } from "~/lib/db/schemas/character";

interface StoredCharacterListProps {
  characters: CharacterDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

function CharacterCard({
  character,
  isSelected,
  onSelect,
  onDelete,
}: {
  character: CharacterDocument;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("pokebox");
  const tags = character.tags ?? [];

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = t("deleteConfirm.description", { name: character.name });
    if (confirm(message)) {
      onDelete();
    }
  };

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
        {character.avatarData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.avatarData}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FolderHeart className="h-12 w-12 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2 w-full overflow-hidden">
        {/* Name and Creator */}
        <div className="min-w-0 w-full overflow-hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="font-semibold text-sm truncate min-w-0">{character.name}</h3>
              </TooltipTrigger>
              <TooltipContent>
                <p>{character.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {character.creator && (
            <p className="text-xs text-muted-foreground truncate min-w-0">
              {t("byCreator", { creator: character.creator })}
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

        {/* Action Buttons */}
        <div className="flex gap-1.5 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StoredCharacterList({
  characters,
  selectedId,
  onSelect,
  onDelete,
  isLoading,
}: StoredCharacterListProps) {
  const t = useTranslations("pokebox");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCharacters = characters.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderHeart className="h-5 w-5" />
            {t("characterList.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderHeart className="h-5 w-5" />
          {t("characterList.title")}
          <Badge variant="secondary" className="ml-auto">
            {characters.length}
          </Badge>
        </CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("characterList.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-2">
        <ScrollArea className="h-full">
          {filteredCharacters.length === 0 ? (
            <div className="text-center py-8">
              <FolderHeart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? t("characterList.noResults") : t("characterList.empty")}
              </p>
              {!searchQuery && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/charx">
                    <FileArchive className="h-4 w-4 mr-2" />
                    {t("characterList.importFromCharx")}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-1 pr-4">
              {filteredCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  isSelected={selectedId === character.id}
                  onSelect={() => onSelect(character.id)}
                  onDelete={() => onDelete(character.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
