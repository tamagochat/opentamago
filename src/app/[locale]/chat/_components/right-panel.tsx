"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { MessageSquare, Book, Image, Plus, Edit, Trash2 } from "lucide-react";
import { useChats, useCharacters } from "~/lib/db/hooks";
import { ChatHistoryList } from "./chat-history-list";
import { LorebookList } from "./lorebook-list";
import { ImageAssetsList } from "./image-assets-list";
import { CharacterEditor } from "./character-editor";
import type { CharacterDocument, ChatDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";

interface RightPanelProps {
  character: CharacterDocument | null;
  onCharacterUpdate: (character: CharacterDocument | null) => void;
  selectedChat: ChatDocument | null;
  onSelectChat: (chat: ChatDocument | null) => void;
  className?: string;
}

export function RightPanel({ 
  character, 
  onCharacterUpdate, 
  selectedChat,
  onSelectChat,
  className 
}: RightPanelProps) {
  const t = useTranslations("chat.rightPanel");
  const tLeft = useTranslations("chat.leftPanel");
  const { deleteCharacter } = useCharacters();
  const { createChat } = useChats(character?.id);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleDelete = async () => {
    if (!character) return;
    if (confirm(t("deleteCharacter", { name: character.name }))) {
      await deleteCharacter(character.id);
      onCharacterUpdate(null);
    }
  };

  const handleNewChat = async () => {
    if (!character) return;
    const chat = await createChat(character.id, `Chat with ${character.name}`);
    if (chat) {
      onSelectChat(chat);
    }
  };

  if (!character) {
    return (
      <div
        className={cn(
          "bg-muted/30 flex h-full flex-col items-center justify-center border-l p-8",
          className
        )}
      >
        <div className="text-muted-foreground text-center">
          <p className="text-sm">{t("selectCharacter")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-muted/30 flex h-full flex-col border-l min-w-0 w-full overflow-hidden", className)}>
      {/* Header with Actions */}
      <div className="flex items-center justify-between border-b p-4 min-w-0 shrink-0">
        <h2 className="text-lg font-semibold truncate min-w-0 flex-1">{t("characterDetails")}</h2>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setEditorOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b shrink-0">
        <div className="flex flex-col items-center text-center min-w-0 w-full">
          <Avatar className="mb-4 h-24 w-24 shrink-0">
            <AvatarImage src={character.avatarData} />
            <AvatarFallback className="text-2xl">
              {character.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-semibold truncate w-full px-2 min-w-0">{character.name}</h3>
          {character.description && (
            <p className="text-muted-foreground mt-1 text-sm line-clamp-3 w-full px-2 break-words overflow-hidden min-w-0">
              {character.description}
            </p>
          )}
          {character.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 w-full px-2 min-w-0">
              {character.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Tabs defaultValue="chats" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-4 shrink-0">
            <TabsTrigger value="chats" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{tLeft("chats")}</span>
            </TabsTrigger>
            <TabsTrigger value="lorebooks" className="gap-1.5">
              <Book className="h-4 w-4" />
              <span className="hidden sm:inline">Lorebooks</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-1.5">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 mt-4 px-4 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden min-h-0">
            {/* New Chat Button */}
            <Button onClick={handleNewChat} className="w-full shrink-0" size="sm">
              <Plus className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{tLeft("newChat")}</span>
            </Button>

            {/* Chat History */}
            <div className="flex-1 overflow-hidden mt-4">
              <ChatHistoryList
                characterId={character.id}
                selectedChat={selectedChat}
                onSelectChat={onSelectChat}
              />
            </div>
          </TabsContent>

          <TabsContent value="lorebooks" className="flex-1 mt-4 px-4 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden min-h-0">
            <LorebookList characterId={character.id} />
          </TabsContent>

          <TabsContent value="images" className="flex-1 mt-4 px-4 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden min-h-0">
            <ImageAssetsList characterId={character.id} />
          </TabsContent>
        </Tabs>
      </div>

      <CharacterEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        character={character}
        onSave={onCharacterUpdate}
      />
    </div>
  );
}
