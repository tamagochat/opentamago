"use client";

import { useState, useCallback, useMemo, memo } from "react";
import {
  Loader2,
  FolderHeart,
  Trash2,
  Search,
  FileArchive,
  Pencil,
  MessageCircle,
  Share2,
  Users,
  FolderInput,
  FolderMinus,
  Folder,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { Link, useRouter } from "~/i18n/routing";
import { setPendingFile, setPendingCharacterId } from "~/lib/stores";
import type { CharacterDocument } from "~/lib/db/schemas/character";
import type { CollectionDocument } from "~/lib/db/schemas/collection";
import { CollectionFilter } from "./collection-filter";
import { CollectionManagerDialog } from "./collection-manager-dialog";

interface StoredCharacterListProps {
  characters: CharacterDocument[];
  collections: CollectionDocument[];
  selectedId: string | null;
  selectedCollectionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectCollection: (id: string | null) => void;
  onAssignToCollection: (characterId: string, collectionId: string | null) => void;
  onCreateCollection: (data: Omit<CollectionDocument, "id" | "createdAt" | "updatedAt" | "order">) => Promise<CollectionDocument | null>;
  onUpdateCollection: (id: string, data: Partial<CollectionDocument>) => Promise<CollectionDocument | null>;
  onDeleteCollection: (id: string) => Promise<boolean>;
  isLoading: boolean;
}

/**
 * Create a charx file from a CharacterDocument
 */
async function createCharxFromCharacter(character: CharacterDocument): Promise<File> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Build character card data (CCv3 format)
  const now = Math.floor(Date.now() / 1000);
  const cardData = {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: character.name,
      description: character.description || "",
      personality: character.personality || "",
      scenario: character.scenario || "",
      first_mes: character.firstMessage || "",
      mes_example: character.exampleDialogue || "",
      creator_notes: character.creatorNotes || "",
      system_prompt: character.systemPrompt || "",
      post_history_instructions: character.postHistoryInstructions || "",
      alternate_greetings: character.alternateGreetings || [],
      tags: character.tags || [],
      creator: character.creator || "",
      character_version: character.characterVersion || "",
      group_only_greetings: character.groupOnlyGreetings || [],
      nickname: character.nickname || "",
      extensions: character.extensions || {},
      creation_date: now,
      modification_date: now,
      assets: [] as Array<{ type: string; uri: string; name: string; ext: string }>,
    },
  };

  // Add avatar as an asset if available
  if (character.avatarData) {
    try {
      // Convert data URL to blob
      const response = await fetch(character.avatarData);
      const blob = await response.blob();
      const ext = blob.type.split("/")[1] || "png";
      const avatarPath = `assets/icon/avatar.${ext}`;
      zip.file(avatarPath, blob);
      cardData.data.assets.push({
        type: "icon",
        uri: `embeded://${avatarPath}`,
        name: "avatar",
        ext,
      });
    } catch (error) {
      console.error("Failed to add avatar to charx:", error);
    }
  }

  // Add card.json
  zip.file("card.json", JSON.stringify(cardData, null, 2));

  // Generate the zip file
  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `${character.name || "character"}.charx`;
  return new File([blob], filename, { type: "application/zip" });
}

const CharacterCard = memo(function CharacterCard({
  character,
  collections,
  isSelected,
  onSelect,
  onDelete,
  onAssignToCollection,
}: {
  character: CharacterDocument;
  collections: CollectionDocument[];
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onAssignToCollection: (collectionId: string | null) => void;
}) {
  const t = useTranslations("pokebox");
  const router = useRouter();
  const tags = character.tags ?? [];
  const [isCreatingCharx, setIsCreatingCharx] = useState(false);

  // Find the collection this character belongs to
  const collection = useMemo(
    () => collections.find((c) => c.id === character.collectionId),
    [collections, character.collectionId]
  );

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = t("deleteConfirm.description", { name: character.name });
    if (confirm(message)) {
      onDelete();
    }
  };

  const handleChat = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/chat?characterId=${character.id}`);
  }, [router, character.id]);

  const handleP2PShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsCreatingCharx(true);
      const charxFile = await createCharxFromCharacter(character);
      setPendingFile(charxFile);
      router.push("/p2p/share");
    } catch (error) {
      console.error("Failed to create charx file:", error);
      toast.error(t("actions.shareError"));
    } finally {
      setIsCreatingCharx(false);
    }
  }, [router, character, t]);

  const handleP2PConnect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setPendingCharacterId(character.id);
    router.push("/p2p/connect");
  }, [router, character.id]);

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md cursor-pointer overflow-hidden",
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
      onClick={onSelect}
    >
      {/* Avatar/Cover - reduced from aspect-square to aspect-[4/3] */}
      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
        {character.avatarData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.avatarData}
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FolderHeart className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Content - reduced padding */}
      <div className="p-2 space-y-1.5 w-full overflow-hidden">
        {/* Name and Creator */}
        <div className="min-w-0 w-full overflow-hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="font-semibold text-xs truncate min-w-0">{character.name}</h3>
              </TooltipTrigger>
              <TooltipContent>
                <p>{character.name}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {character.creator && (
            <p className="text-[10px] text-muted-foreground truncate min-w-0">
              {t("byCreator", { creator: character.creator })}
            </p>
          )}
        </div>

        {/* Collection Badge */}
        {collection && (
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className="text-[9px] px-1 py-0 truncate max-w-full h-4"
              style={{
                borderColor: collection.color,
                color: collection.color,
              }}
            >
              <Folder className="h-2 w-2 mr-0.5" />
              {collection.name}
            </Badge>
          </div>
        )}

        {/* Tags - hidden on very small cards to save space */}
        {tags.length > 0 && (
          <div className="flex gap-0.5 flex-wrap w-full overflow-hidden">
            {tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[9px] px-1 py-0 truncate max-w-[60px] h-4"
              >
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Action Buttons - Merged Button Group - smaller */}
        <div className="flex">
          {/* Edit Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-[10px] rounded-r-none border-r-0 px-1"
            asChild
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/charx/editor?characterId=${character.id}`}>
              <Pencil className="h-3 w-3" />
            </Link>
          </Button>

          {/* Share Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-6 text-[10px] rounded-none border-r-0 px-1"
                onClick={(e) => e.stopPropagation()}
                disabled={isCreatingCharx}
              >
                {isCreatingCharx ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Share2 className="h-3 w-3" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleP2PShare} disabled={isCreatingCharx}>
                <Share2 className="h-4 w-4 mr-2" />
                {t("actions.p2pShare")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleP2PConnect}>
                <Users className="h-4 w-4 mr-2" />
                {t("actions.p2pConnect")}
              </DropdownMenuItem>
              {/* Collection submenu */}
              {collections.length > 0 && (
                <>
                  <div className="h-px bg-border my-1" />
                  {collections.map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignToCollection(col.id);
                      }}
                      disabled={character.collectionId === col.id}
                    >
                      <FolderInput className="h-4 w-4 mr-2" style={{ color: col.color }} />
                      {col.name}
                    </DropdownMenuItem>
                  ))}
                  {character.collectionId && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignToCollection(null);
                      }}
                    >
                      <FolderMinus className="h-4 w-4 mr-2 text-muted-foreground" />
                      {t("collections.removeFromCollection")}
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-6 text-[10px] rounded-l-none text-destructive hover:text-destructive hover:bg-destructive/10 px-1"
            onClick={handleDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Chat Button - smaller */}
        <Button
          variant="default"
          size="sm"
          className="w-full h-6 text-[10px]"
          onClick={handleChat}
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          {t("actions.chat")}
        </Button>
      </div>
    </div>
  );
});

// Memoized search input to prevent re-rendering the entire list when typing
const SearchInput = memo(function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-7 h-7 text-xs"
      />
    </div>
  );
});

// Memoized character grid to prevent re-rendering when search input changes
const CharacterGrid = memo(function CharacterGrid({
  characters,
  collections,
  selectedId,
  onSelect,
  onDelete,
  onAssignToCollection,
}: {
  characters: CharacterDocument[];
  collections: CollectionDocument[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onAssignToCollection: (characterId: string, collectionId: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-1 pl-1 pr-3">
      {characters.map((character) => (
        <CharacterCard
          key={character.id}
          character={character}
          collections={collections}
          isSelected={selectedId === character.id}
          onSelect={() => onSelect(character.id)}
          onDelete={() => onDelete(character.id)}
          onAssignToCollection={(collectionId) =>
            onAssignToCollection(character.id, collectionId)
          }
        />
      ))}
    </div>
  );
});

export function StoredCharacterList({
  characters,
  collections,
  selectedId,
  selectedCollectionId,
  onSelect,
  onDelete,
  onSelectCollection,
  onAssignToCollection,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  isLoading,
}: StoredCharacterListProps) {
  const t = useTranslations("pokebox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCollectionManager, setShowCollectionManager] = useState(false);
  const [collectionDialogMode, setCollectionDialogMode] = useState<"create" | "manage">("manage");

  // Filter characters by collection and search query
  const filteredCharacters = useMemo(() => {
    let filtered = characters;

    // Filter by collection
    if (selectedCollectionId === "__uncategorized__") {
      const collectionIds = new Set(collections.map((c) => c.id));
      filtered = filtered.filter(
        (c) => !c.collectionId || !collectionIds.has(c.collectionId)
      );
    } else if (selectedCollectionId) {
      filtered = filtered.filter((c) => c.collectionId === selectedCollectionId);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [characters, collections, selectedCollectionId, searchQuery]);

  const handleCreateCollection = useCallback(() => {
    setCollectionDialogMode("create");
    setShowCollectionManager(true);
  }, []);

  const handleManageCollections = useCallback(() => {
    setCollectionDialogMode("manage");
    setShowCollectionManager(true);
  }, []);

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
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0 space-y-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FolderHeart className="h-4 w-4" />
            {t("characterList.title")}
            <Badge variant="secondary" className="ml-auto text-[10px] h-5">
              {characters.length}
            </Badge>
          </CardTitle>

          {/* Collection Filter */}
          <CollectionFilter
            collections={collections}
            characters={characters}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={onSelectCollection}
            onManageCollections={handleManageCollections}
            onCreateCollection={handleCreateCollection}
          />

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("characterList.search")}
          />
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden pt-1 px-3">
          <ScrollArea className="h-full">
            {filteredCharacters.length === 0 ? (
              <div className="text-center py-6">
                <FolderHeart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery
                    ? t("characterList.noResults")
                    : selectedCollectionId
                    ? t("collections.emptyCollection")
                    : t("characterList.empty")}
                </p>
                {!searchQuery && !selectedCollectionId && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/charx">
                      <FileArchive className="h-4 w-4 mr-2" />
                      {t("characterList.importFromCharx")}
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <CharacterGrid
                characters={filteredCharacters}
                collections={collections}
                selectedId={selectedId}
                onSelect={onSelect}
                onDelete={onDelete}
                onAssignToCollection={onAssignToCollection}
              />
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Collection Manager Dialog */}
      <CollectionManagerDialog
        open={showCollectionManager}
        onOpenChange={setShowCollectionManager}
        collections={collections}
        onCreateCollection={onCreateCollection}
        onUpdateCollection={onUpdateCollection}
        onDeleteCollection={onDeleteCollection}
        mode={collectionDialogMode}
      />
    </>
  );
}
