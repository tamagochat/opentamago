"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { Egg, Plus, UserPlus, FileUp, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { useCharacters, useChats } from "~/lib/db/hooks";
import { CharacterEditor } from "./character-editor";
import { PersonaEditor } from "./persona-editor";
import { SettingsModal } from "./settings-modal";
import { CharacterList } from "./character-list";
import { RecentChatsList } from "./recent-chats-list";
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
  const { characters, deleteCharacter } = useCharacters();
  const { createChat, deleteChat } = useChats(selectedCharacter?.id);
  const [characterEditorOpen, setCharacterEditorOpen] = useState(false);
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateCharacter = () => {
    setEditingCharacter(null);
    setCharacterEditorOpen(true);
  };

  const handleCreatePersona = () => {
    setPersonaEditorOpen(true);
  };

  const handleImportCharx = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: Implement .charx import logic
    console.log("Importing file:", file.name);
    alert(t("importComingSoon"));

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  const handleStartChat = async () => {
    if (!selectedCharacter) return;
    const chat = await createChat(selectedCharacter.id, `Chat with ${selectedCharacter.name}`);
    if (chat) {
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Egg className="h-6 w-6 text-primary shrink-0" />
          <h1 className="text-lg font-semibold truncate">{tCommon("appName")}</h1>
        </div>
        <div className="shrink-0">
          <SettingsModal open={settingsOpen} onOpenChange={onSettingsOpenChange} />
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".charx,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      <ScrollArea className="flex-1 min-w-0">
        <div className="p-2 min-w-0">
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
              <DropdownMenuItem onClick={handleImportCharx}>
                <FileUp className="mr-2 h-4 w-4" />
                {t("importCharx")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreatePersona}>
                <User className="mr-2 h-4 w-4" />
                {t("createPersona")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Characters Section */}
          <div className="mb-4">
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
            />
          </div>

          {/* Recent Chats Section */}
          <Separator className="my-4" />
          <div>
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
        onSave={(char) => onSelectCharacter(char)}
      />
    </div>
  );
}
