"use client";

import { useState, useCallback, memo } from "react";
import { FolderHeart, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { StoredCharacterList } from "./_components/stored-character-list";
import { StoredCharacterDisplay } from "./_components/stored-character-display";
import { StoredLorebookDisplay } from "./_components/stored-lorebook-display";
import { StoredAssetsDisplay } from "./_components/stored-assets-display";
import { useCharacters } from "~/lib/db/hooks/useCharacters";
import { useCollections } from "~/lib/db/hooks/useCollections";
import { useLorebookEntries } from "~/lib/db/hooks/useLorebookEntries";
import { useCharacterAssets } from "~/lib/db/hooks/useCharacterAssets";
import { cn } from "~/lib/utils";

export default function PokeboxPage() {
  const t = useTranslations("pokebox");
  const {
    characters,
    isLoading: charactersLoading,
    deleteCharacter,
    assignToCollection,
  } = useCharacters();
  const {
    collections,
    isLoading: collectionsLoading,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useCollections();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? null;

  const { entries: lorebookEntries, isLoading: lorebookLoading } = useLorebookEntries(selectedCharacterId ?? undefined);
  const { assets, isLoading: assetsLoading } = useCharacterAssets(selectedCharacterId ?? undefined);

  const handleSelect = useCallback((id: string) => {
    setSelectedCharacterId(id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCharacterId(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const success = await deleteCharacter(id);
    if (success && selectedCharacterId === id) {
      setSelectedCharacterId(null);
    }
  }, [deleteCharacter, selectedCharacterId]);

  const handleSelectCollection = useCallback((id: string | null) => {
    setSelectedCollectionId(id);
  }, []);

  const handleAssignToCollection = useCallback(async (characterId: string, collectionId: string | null) => {
    const success = await assignToCollection(characterId, collectionId);
    if (success) {
      toast.success(collectionId ? t("collections.moveToCollection") : t("collections.removeFromCollection"));
    }
  }, [assignToCollection, t]);

  return (
    <div className="container max-w-7xl py-4 md:py-8 px-4 md:px-6">
      {/* Header - Hidden on mobile when character is selected */}
      <div className={cn(
        "mb-4 md:mb-8",
        selectedCharacterId && "hidden md:block"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FolderHeart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{t("title")}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Mobile Back Button & Character Name */}
      {selectedCharacter && (
        <div className="flex items-center gap-3 mb-4 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-9 px-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Button>
          <span className="font-medium truncate">{selectedCharacter.name}</span>
        </div>
      )}

      {/* Two Panel Layout - Desktop / Single Panel - Mobile */}
      <div className="flex gap-6 h-[calc(100vh-180px)] md:h-[calc(100vh-200px)] min-h-[400px] md:min-h-[600px]">
        {/* Left Panel - Character List */}
        {/* Hidden on mobile when character selected */}
        <div className={cn(
          "w-full md:w-96 flex-shrink-0 overflow-hidden flex flex-col",
          selectedCharacterId && "hidden md:flex"
        )}>
          <StoredCharacterList
            characters={characters}
            collections={collections}
            selectedId={selectedCharacterId}
            selectedCollectionId={selectedCollectionId}
            onSelect={handleSelect}
            onDelete={handleDelete}
            onSelectCollection={handleSelectCollection}
            onAssignToCollection={handleAssignToCollection}
            onCreateCollection={createCollection}
            onUpdateCollection={updateCollection}
            onDeleteCollection={deleteCollection}
            isLoading={charactersLoading || collectionsLoading}
          />
        </div>

        {/* Right Panel - Details with Tabs */}
        {/* Hidden on mobile when no character selected */}
        <div className={cn(
          "flex-1 overflow-hidden",
          !selectedCharacterId && "hidden md:block"
        )}>
          {!selectedCharacter ? (
            <EmptyState message={t("selectCharacter")} />
          ) : (
            <CharacterDetailsPanel
              character={selectedCharacter}
              lorebookEntries={lorebookEntries}
              lorebookLoading={lorebookLoading}
              assets={assets}
              assetsLoading={assetsLoading}
              characterId={selectedCharacterId!}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const EmptyState = memo(function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center rounded-lg border border-dashed">
      <div className="text-center">
        <FolderHeart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
});

const ModulePlaceholder = memo(function ModulePlaceholder() {
  const t = useTranslations("pokebox");
  return (
    <div className="h-full flex items-center justify-center rounded-lg border border-dashed">
      <div className="text-center">
        <p className="text-muted-foreground">{t("moduleNotStored")}</p>
      </div>
    </div>
  );
});

// Memoized character details panel to prevent re-rendering when left panel state changes
const CharacterDetailsPanel = memo(function CharacterDetailsPanel({
  character,
  lorebookEntries,
  lorebookLoading,
  assets,
  assetsLoading,
  characterId,
}: {
  character: NonNullable<ReturnType<typeof import("~/lib/db/hooks/useCharacters").useCharacters>["characters"][0]>;
  lorebookEntries: ReturnType<typeof import("~/lib/db/hooks/useLorebookEntries").useLorebookEntries>["entries"];
  lorebookLoading: boolean;
  assets: ReturnType<typeof import("~/lib/db/hooks/useCharacterAssets").useCharacterAssets>["assets"];
  assetsLoading: boolean;
  characterId: string;
}) {
  const t = useTranslations("pokebox");

  return (
    <Tabs defaultValue="character" className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
        <TabsTrigger value="character" className="text-xs md:text-sm px-1 md:px-3">
          {t("tabs.character")}
        </TabsTrigger>
        <TabsTrigger value="lorebook" className="text-xs md:text-sm px-1 md:px-3">
          <span className="truncate">{t("tabs.lorebook")}</span>
          {lorebookEntries.length > 0 && (
            <span className="ml-1 text-xs hidden sm:inline">({lorebookEntries.length})</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="assets" className="text-xs md:text-sm px-1 md:px-3">
          {t("tabs.assets")}
          {assets.length > 0 && (
            <span className="ml-1 text-xs hidden sm:inline">({assets.length})</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="module" className="text-xs md:text-sm px-1 md:px-3">
          {t("tabs.module")}
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-auto mt-4">
        <TabsContent value="character" className="mt-0 h-full">
          <StoredCharacterDisplay
            character={character}
            isLoading={false}
          />
        </TabsContent>

        <TabsContent value="lorebook" className="mt-0 h-full">
          <StoredLorebookDisplay
            entries={lorebookEntries}
            characterName={character.name}
            isLoading={lorebookLoading}
          />
        </TabsContent>

        <TabsContent value="assets" className="mt-0 h-full">
          <StoredAssetsDisplay
            characterId={characterId}
            assets={assets}
            isLoading={assetsLoading}
          />
        </TabsContent>

        <TabsContent value="module" className="mt-0 h-full">
          <ModulePlaceholder />
        </TabsContent>
      </div>
    </Tabs>
  );
});
