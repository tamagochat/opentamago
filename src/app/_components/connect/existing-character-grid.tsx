"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useCharacters } from "~/lib/db/hooks";
import type { CharacterDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";
import { Link } from "~/i18n/routing";

interface ExistingCharacterGridProps {
  onSelect: (character: CharacterDocument) => void;
  isLoading?: boolean;
}

export function ExistingCharacterGrid({
  onSelect,
  isLoading: externalLoading,
}: ExistingCharacterGridProps) {
  const t = useTranslations("connect");
  const tChat = useTranslations("chat.leftPanel");
  const { characters, isLoading: charactersLoading } = useCharacters();

  const isLoading = externalLoading || charactersLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center p-4 rounded-lg border">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 mt-3" />
            <Skeleton className="h-3 w-32 mt-2" />
          </div>
        ))}
      </div>
    );
  }

  if (characters.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t("noCharacters")}</p>
        <Button variant="link" className="mt-2" asChild>
          <Link href="/chat">{t("createInChat")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {characters.map((character) => (
        <button
          key={character.id}
          onClick={() => onSelect(character)}
          className={cn(
            "flex flex-col items-center p-4 rounded-lg border",
            "hover:bg-accent hover:border-primary/50 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
        >
          <Avatar className="h-16 w-16">
            <AvatarImage src={character.avatarData} />
            <AvatarFallback className="text-lg">
              {character.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="mt-3 font-medium text-sm truncate max-w-full">
            {character.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 text-center">
            {character.description || tChat("noDescription")}
          </p>
        </button>
      ))}
    </div>
  );
}
