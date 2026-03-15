"use client";

import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "~/components/ui/sheet";
import { LeftPanel } from "./_components/left-panel";
import { CenterPanel } from "./_components/center-panel";
import { RightPanel } from "./_components/right-panel";
import { ChatMobileHeader } from "./_components/chat-mobile-header";
import { useChats } from "~/lib/db/hooks";
import type { CharacterDocument, ChatDocument } from "~/lib/db/schemas";

export default function ChatPage() {
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDocument | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatDocument | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"apiKeys" | "chatUI" | "database" | undefined>(undefined);

  const handleOpenSettings = useCallback((tab?: "apiKeys" | "chatUI" | "database") => {
    setSettingsInitialTab(tab);
    setSettingsOpen(true);
  }, []);

  // Fetch chats for the selected character
  const { chats, createChat } = useChats(selectedCharacter?.id);

  const handleNewChat = useCallback(async () => {
    if (!selectedCharacter) return;
    const newChat = await createChat(selectedCharacter.id);
    if (newChat) setSelectedChat(newChat);
  }, [selectedCharacter, createChat]);

  // Close mobile panels when selection changes
  useEffect(() => {
    setLeftPanelOpen(false);
  }, [selectedChat?.id]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Desktop Left Panel */}
      <div className="hidden w-80 shrink-0 md:block">
        <LeftPanel
          selectedCharacter={selectedCharacter}
          selectedChat={selectedChat}
          onSelectCharacter={setSelectedCharacter}
          onSelectChat={setSelectedChat}
          settingsOpen={settingsOpen}
          onSettingsOpenChange={setSettingsOpen}
          settingsInitialTab={settingsInitialTab}
        />
      </div>

      {/* Mobile Left Panel (Sheet) */}
      <Sheet open={leftPanelOpen} onOpenChange={setLeftPanelOpen}>
        <SheetContent side="left" className="w-80 p-0 [&>button:first-of-type]:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Character and chat navigation</SheetDescription>
          <LeftPanel
            selectedCharacter={selectedCharacter}
            selectedChat={selectedChat}
            onSelectCharacter={setSelectedCharacter}
            onSelectChat={setSelectedChat}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
            settingsInitialTab={settingsInitialTab}
          />
        </SheetContent>
      </Sheet>

      {/* Center Panel */}
      <div className="relative flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Mobile Header (below md) */}
        <ChatMobileHeader
          character={selectedCharacter}
          chat={selectedChat}
          chats={chats}
          onMenuClick={() => setLeftPanelOpen(true)}
          onSettingsClick={() => setSettingsOpen(true)}
          onSelectChat={setSelectedChat}
          onNewChat={handleNewChat}
          rightPanelOpen={rightPanelOpen}
          onRightPanelOpenChange={setRightPanelOpen}
        />

        {/* Chat Area */}
        <CenterPanel
          character={selectedCharacter}
          chat={selectedChat}
          onSelectChat={setSelectedChat}
          onSelectCharacter={setSelectedCharacter}
          onOpenSettings={handleOpenSettings}
          className="flex-1 min-h-0"
          rightPanelOpen={rightPanelOpen}
          onRightPanelOpenChange={setRightPanelOpen}
        />
      </div>

      {/* Desktop Right Panel */}
      <div className="hidden max-w-[440px] lg:block">
        <RightPanel
          character={selectedCharacter}
          onCharacterUpdate={setSelectedCharacter}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
        />
      </div>

      {/* Mobile Right Panel (Sheet) */}
      <Sheet open={rightPanelOpen} onOpenChange={setRightPanelOpen}>
        <SheetContent side="right" className="w-full max-w-[360px] p-0 [&>button:first-of-type]:hidden">
          <SheetTitle className="sr-only">Character Details</SheetTitle>
          <SheetDescription className="sr-only">View and edit character information</SheetDescription>
          <RightPanel
            character={selectedCharacter}
            onCharacterUpdate={(char) => {
              setSelectedCharacter(char);
              if (!char) setRightPanelOpen(false);
            }}
            selectedChat={selectedChat}
            onSelectChat={setSelectedChat}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
