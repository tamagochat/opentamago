"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Send, Loader2, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
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

export function ChatRoom({
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
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages or thinking status change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinkingPeers]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSendMessage(input.trim(), true);
    setInput("");
    inputRef.current?.focus();
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Get character for a message (returns full CharacterData for self, CharacterInfo for others)
  const getCharacterForMessage = (
    senderId: string
  ): CharacterData | CharacterInfo | undefined => {
    if (senderId === myPeerId) return myCharacter;
    const participant = participants.find((p) => p.peerId === senderId);
    return participant?.character ?? undefined;
  };

  // Split participants into active (with character) and pending (without)
  // Note: myCharacter is CharacterData (full), others are CharacterInfo (minimal - name and avatar only)
  const activeParticipants: Array<{ peerId: string; character: CharacterData | CharacterInfo }> = [
    { peerId: myPeerId, character: myCharacter },
    ...participants
      .filter((p) => p.status === "ready" && p.character !== null)
      .map((p) => ({ peerId: p.peerId, character: p.character! })),
  ];

  const pendingParticipants = participants.filter(
    (p) => p.status === "pending" || p.status === "connecting"
  );

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
              {activeParticipants.length} {t("chat.participants")}
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
            <Button variant="ghost" size="sm" onClick={onLeave}>
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

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.placeholder", { name: myCharacter.name })}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Participants Sidebar */}
      <Card className="hidden md:flex w-48 flex-col p-4 overflow-hidden">
        {/* Active Participants */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold">{t("chat.active")}</h3>
          <Badge variant="secondary" className="text-xs">
            {activeParticipants.length}
          </Badge>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {activeParticipants.map((p) => (
            <div key={p.peerId} className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={p.character.avatar} />
                <AvatarFallback className="text-xs">
                  {p.character.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {p.character.name}
                </p>
                {p.peerId === myPeerId && (
                  <p className="text-xs text-muted-foreground">
                    {t("lobby.you")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pending Participants */}
        {pendingParticipants.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("chat.pending")}
              </h4>
              <Badge variant="outline" className="text-xs">
                {pendingParticipants.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {pendingParticipants.map((p) => (
                <div
                  key={p.peerId}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <span className="text-xs truncate">
                    {t("lobby.selectingCharacter")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
