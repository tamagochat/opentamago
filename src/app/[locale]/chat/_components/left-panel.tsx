"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Egg, Plus, UserPlus, FileUp, FileJson, User, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { useCharacters, useChats, useSettings } from "~/lib/db/hooks";
import { parseCharXToCharacter, parseJsonToCharacter } from "~/lib/charx/hooks";
import { CharacterEditor } from "./character-editor";
import { PersonaEditor } from "./persona-editor";
import { SettingsDropdown } from "~/components/settings-dropdown";
import { CharacterList } from "./character-list";
import { RecentChatsList } from "./recent-chats-list";
import { Link } from "~/i18n/routing";
import type { CharacterDocument, ChatDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";

interface LeftPanelProps {
  selectedCharacter: CharacterDocument | null;
  selectedChat: ChatDocument | null;
  onSelectCharacter: (character: CharacterDocument | null) => void;
  onSelectChat: (chat: ChatDocument | null) => void;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  className?: string;
}

export function LeftPanel({
  selectedCharacter,
  selectedChat,
  onSelectCharacter,
  onSelectChat,
  settingsOpen,
  onSettingsOpenChange,
  className,
}: LeftPanelProps) {
  const t = useTranslations("chat.leftPanel");
  const tCommon = useTranslations("common");
  const { characters, saveCharacterWithAssets, deleteCharacter } = useCharacters();
  const { createChat, deleteChat } = useChats(selectedCharacter?.id);
  const { settings } = useSettings();
  const [characterEditorOpen, setCharacterEditorOpen] = useState(false);
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterDocument | null>(null);
  const charxInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleCreateCharacter = () => {
    setEditingCharacter(null);
    setCharacterEditorOpen(true);
  };

  const handleCreatePersona = () => {
    setPersonaEditorOpen(true);
  };

  const handleImportCharx = () => {
    charxInputRef.current?.click();
  };

  const handleImportJson = () => {
    jsonInputRef.current?.click();
  };

  const handleCharxFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (charxInputRef.current) {
      charxInputRef.current.value = "";
    }

    setIsImporting(true);
    try {
      const saveData = await parseCharXToCharacter(file);

      console.log("Saving character from CharX import:", {
        characterName: saveData.character.name,
        hasAvatar: !!saveData.avatarBlob,
        lorebookEntriesCount: saveData.lorebookEntries.length,
        assetsCount: saveData.assets.length,
      });

      const saved = await saveCharacterWithAssets(saveData);

      if (saved) {
        toast.success(t("importSuccess"), { description: saved.name });
        onSelectCharacter(saved);
      }
    } catch (error) {
      console.error("Failed to import character:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t("importError"), { description: errorMessage });
    } finally {
      setIsImporting(false);
    }
  };

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (jsonInputRef.current) {
      jsonInputRef.current.value = "";
    }

    setIsImporting(true);
    try {
      const saveData = await parseJsonToCharacter(file);

      console.log("Saving character from JSON import:", {
        characterName: saveData.character.name,
        lorebookEntriesCount: saveData.lorebookEntries.length,
      });

      const saved = await saveCharacterWithAssets(saveData);

      if (saved) {
        toast.success(t("importSuccess"), { description: saved.name });
        onSelectCharacter(saved);
      }
    } catch (error) {
      console.error("Failed to import character:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t("importError"), { description: errorMessage });
    } finally {
      setIsImporting(false);
    }
  };

  const handleEditCharacter = (character: CharacterDocument) => {
    setEditingCharacter(character);
    setCharacterEditorOpen(true);
  };

  const handleDeleteCharacter = async (character: CharacterDocument) => {
    if (confirm(t("deleteCharacter", { name: character.name }))) {
      await deleteCharacter(character.id);
      if (selectedCharacter?.id === character.id) {
        onSelectCharacter(null);
        onSelectChat(null);
      }
    }
  };

  const handleStartChat = async (character?: CharacterDocument) => {
    const targetCharacter = character ?? selectedCharacter;
    if (!targetCharacter) return;
    const chat = await createChat(
      targetCharacter.id,
      `Chat with ${targetCharacter.name}`,
      settings.defaultPersonaId
    );
    if (chat) {
      onSelectCharacter(targetCharacter);
      onSelectChat(chat);
    }
  };

  const handleSelectCharacterFromChat = (character: CharacterDocument) => {
    onSelectCharacter(character);
  };

  const handleSelectChat = (chat: ChatDocument, character?: CharacterDocument) => {
    if (character) {
      onSelectCharacter(character);
    }
    onSelectChat(chat);
  };

  const handleDeleteChat = async (chat: ChatDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t("deleteChat"))) {
      await deleteChat(chat.id);
      if (selectedChat?.id === chat.id) {
        onSelectChat(null);
      }
    }
  };

  return (
    <div className={cn("bg-muted/30 flex h-full flex-col border-r min-w-0 w-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 min-w-0">
        <Link href="/" className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity">
          <Egg className="h-6 w-6 text-primary shrink-0" />
          <h1 className="text-lg font-semibold truncate">{tCommon("appName")}</h1>
        </Link>
        <div className="shrink-0">
          <SettingsDropdown settingsOpen={settingsOpen} onSettingsOpenChange={onSettingsOpenChange} />
        </div>
      </div>

      {/* Hidden file inputs for import */}
      <input
        ref={charxInputRef}
        type="file"
        accept=".charx"
        onChange={handleCharxFileChange}
        className="hidden"
        disabled={isImporting}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        onChange={handleJsonFileChange}
        className="hidden"
        disabled={isImporting}
      />

      <ScrollArea className="flex-1 min-w-0 w-full [&>[data-slot=scroll-area-viewport]]:!overflow-x-hidden">
        <div className="p-2 w-full">
          {/* Create Dropdown Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="mb-3 w-full justify-start gap-2">
                <Plus className="h-4 w-4" />
                {t("create")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 max-w-[calc(100vw-2rem)]">
              <DropdownMenuItem onClick={handleCreateCharacter}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t("createCharacter")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportCharx} disabled={isImporting}>
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="mr-2 h-4 w-4" />
                )}
                {isImporting ? t("importing") : t("importCharx")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportJson} disabled={isImporting}>
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileJson className="mr-2 h-4 w-4" />
                )}
                {isImporting ? t("importing") : t("importJson")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreatePersona}>
                <User className="mr-2 h-4 w-4" />
                {t("createPersona")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Characters Section */}
          <div className="mb-4 w-full overflow-hidden">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
              {t("characters")}
            </h3>
            <CharacterList
              selectedCharacter={selectedCharacter}
              onSelectCharacter={(character) => {
                onSelectCharacter(character);
                onSelectChat(null);
              }}
              onEditCharacter={handleEditCharacter}
              onDeleteCharacter={handleDeleteCharacter}
              onCreateCharacter={handleCreateCharacter}
              onNewChat={handleStartChat}
            />
          </div>

          {/* Recent Chats Section */}
          <Separator className="my-4" />
          <div className="w-full overflow-hidden">
            <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
              {t("recentChats")}
            </h3>
            <RecentChatsList
              characters={characters}
              selectedChat={selectedChat}
              onSelectChat={handleSelectChat}
              onDeleteChat={handleDeleteChat}
            />
          </div>
        </div>
      </ScrollArea>

      <CharacterEditor
        open={characterEditorOpen}
        onOpenChange={setCharacterEditorOpen}
        character={editingCharacter}
        onSave={(char) => onSelectCharacter(char)}
      />

      <PersonaEditor
        open={personaEditorOpen}
        onOpenChange={setPersonaEditorOpen}
      />
    </div>
  );
}
