"use client";

import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useCharacters } from "~/lib/db/hooks";
import type { CharacterDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";

interface CharacterListProps {
  selectedCharacter: CharacterDocument | null;
  onSelectCharacter: (character: CharacterDocument) => void;
  onEditCharacter: (character: CharacterDocument) => void;
  onDeleteCharacter: (character: CharacterDocument) => void;
  onCreateCharacter: () => void;
}

export function CharacterList({
  selectedCharacter,
  onSelectCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onCreateCharacter,
}: CharacterListProps) {
  const t = useTranslations("chat.leftPanel");
  const tActions = useTranslations("actions");
  const tCommon = useTranslations("common");
  const { characters, isLoading: charactersLoading } = useCharacters();

  if (charactersLoading) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm min-w-0">
        {tCommon("loading")}
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm min-w-0">
        {t("noCharacters")}
        <br />
        <Button variant="link" className="h-auto p-0" onClick={onCreateCharacter}>
          {t("createOne")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {characters.map((character) => (
        <div
          key={character.id}
          className={cn(
            "hover:bg-accent group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors w-full",
            selectedCharacter?.id === character.id && "bg-accent"
          )}
          onClick={() => onSelectCharacter(character)}
        >
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={character.avatarData} />
            <AvatarFallback>{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium max-w-[180px]">{character.name}</p>
            <p className="truncate text-muted-foreground text-xs max-w-[180px]">
              {character.description || t("noDescription")}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 group-hover:opacity-100 md:opacity-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
              <DropdownMenuItem onClick={() => onEditCharacter(character)}>
                {tActions("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeleteCharacter(character)}
              >
                {tActions("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}

