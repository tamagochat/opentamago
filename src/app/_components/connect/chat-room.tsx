"use client";

import { useState, useCallback, useRef, useEffect, memo } from "react";
import { useTranslations } from "next-intl";
import { Loader2, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { ParticipantList } from "./participant-list";
import { LeaveConfirmDialog } from "./leave-confirm-dialog";
import { ChatRoomInput } from "./chat-room-input";
import type { Participant, ChatItemType } from "./hooks/use-connect-peers";
import type { CharacterData, CharacterInfo, ChatMessageType, SystemMessageType } from "~/lib/connect/messages";

interface ChatRoomProps {
  myPeerId: string;
  myCharacter: CharacterData;
  participants: Participant[];
  messages: ChatItemType[];
  autoReplyEnabled: boolean;
  thinkingPeers: string[];
  isHost?: boolean;
  onSendMessage: (content: string, isHuman: boolean) => void;
  onToggleAutoReply: (enabled: boolean) => void;
  onBackToLobby?: () => void;
  onLeave: () => void;
}

export const ChatRoom = memo(function ChatRoom({
  myPeerId,
  myCharacter,
  participants,
  messages,
  autoReplyEnabled,
  thinkingPeers,
  isHost = false,
  onSendMessage,
  onToggleAutoReply,
  onBackToLobby,
  onLeave,
}: ChatRoomProps) {
  const t = useTranslations("connect");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or thinking status change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinkingPeers]);

  // Get character for a message (returns full CharacterData for self, CharacterInfo for others)
  const getCharacterForMessage = (
    senderId: string
  ): CharacterData | CharacterInfo | undefined => {
    if (senderId === myPeerId) return myCharacter;
    const participant = participants.find((p) => p.peerId === senderId);
    return participant?.character ?? undefined;
  };

  // Count active participants for header badge
  const activeCount = participants.filter(
    (p) => p.status === "ready" && p.character !== null
  ).length + 1; // +1 for self

  return (
    <div className="flex h-[calc(100vh-12rem)] w-full max-w-4xl mx-auto gap-4">
      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {isHost && onBackToLobby && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToLobby}
                className="mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="font-semibold">{t("chat.title")}</h2>
            <Badge variant="secondary">
              {activeCount} {t("chat.participants")}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-reply"
                checked={autoReplyEnabled}
                onCheckedChange={onToggleAutoReply}
              />
              <Label htmlFor="auto-reply" className="text-sm">
                {t("chat.autoReply")}
              </Label>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowLeaveConfirm(true)}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                {t("chat.noMessages")}
              </div>
            )}

            {messages.map((message) => {
              // System message (join/leave)
              if (message.type === "SystemMessage") {
                const systemMsg = message as SystemMessageType;
                return (
                  <div
                    key={systemMsg.id}
                    className="flex justify-center py-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {systemMsg.event === "joined"
                        ? t("chat.userJoined", { name: systemMsg.characterName })
                        : t("chat.userLeft", { name: systemMsg.characterName })}
                    </span>
                  </div>
                );
              }

              // Regular chat message
              const chatMessage = message as ChatMessageType;
              const character = getCharacterForMessage(chatMessage.senderId);
              const isMe = chatMessage.senderId === myPeerId;

              return (
                <div
                  key={chatMessage.id}
                  className={cn(
                    "flex gap-3",
                    isMe && "flex-row-reverse"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={character?.avatar} />
                    <AvatarFallback className="text-xs">
                      {character?.name.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={cn(
                      "flex flex-col max-w-[70%]",
                      isMe && "items-end"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {character?.name || t("chat.unknown")}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "rounded-lg px-4 py-2",
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {chatMessage.content}
                      </p>
                    </div>

                    <span className="text-xs text-muted-foreground mt-1">
                      {new Date(chatMessage.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Thinking indicators for all thinking peers */}
            {thinkingPeers.map((peerId) => {
              const isMe = peerId === myPeerId;
              const character = isMe
                ? myCharacter
                : participants.find((p) => p.peerId === peerId)?.character;

              if (!character) return null;

              return (
                <div
                  key={`thinking-${peerId}`}
                  className={cn("flex gap-3", isMe && "flex-row-reverse")}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={character.avatar} />
                    <AvatarFallback className="text-xs">
                      {character.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "flex items-center gap-2 text-muted-foreground",
                      isMe && "flex-row-reverse"
                    )}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      {t("chat.thinking", { name: character.name })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input - Isolated component to prevent re-renders when typing */}
        <ChatRoomInput
          placeholder={t("chat.placeholder", { name: myCharacter.name })}
          onSendMessage={onSendMessage}
        />
      </Card>

      {/* Participants Sidebar */}
      <Card className="hidden md:flex w-48 flex-col p-4 overflow-hidden">
        <ParticipantList
          myPeerId={myPeerId}
          myCharacter={myCharacter}
          participants={participants}
          variant="sidebar"
          showPending={true}
        />
      </Card>

      <LeaveConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onConfirm={onLeave}
      />
    </div>
  );
});
