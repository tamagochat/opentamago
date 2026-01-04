"use client";

import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { MessageSquare, Trash2 } from "lucide-react";
import { useChats } from "~/lib/db/hooks";
import type { CharacterDocument, ChatDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";

interface RecentChatsListProps {
  characters: CharacterDocument[];
  selectedChat: ChatDocument | null;
  onSelectChat: (chat: ChatDocument, character?: CharacterDocument) => void;
  onDeleteChat: (chat: ChatDocument, e: React.MouseEvent) => void;
}

export function RecentChatsList({
  characters,
  selectedChat,
  onSelectChat,
  onDeleteChat,
}: RecentChatsListProps) {
  const t = useTranslations("chat.leftPanel");
  const tCommon = useTranslations("common");
  const { chats: allChats, isLoading: allChatsLoading } = useChats();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return t("yesterday");
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (allChatsLoading) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm min-w-0">
        {tCommon("loading")}
      </div>
    );
  }

  if (allChats.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm min-w-0">
        {t("noChats")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {allChats.map((chat) => {
        const chatCharacter = characters.find((c) => c.id === chat.characterId);
        return (
          <div
            key={chat.id}
            className={cn(
              "hover:bg-accent group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors w-full",
              selectedChat?.id === chat.id && "bg-accent"
            )}
            onClick={() => onSelectChat(chat, chatCharacter)}
          >
            {chatCharacter ? (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={chatCharacter.avatarData} />
                <AvatarFallback className="text-xs">
                  {chatCharacter.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <MessageSquare className="text-muted-foreground h-5 w-5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium max-w-[180px]">{chat.title}</p>
              <p className="truncate text-muted-foreground text-xs max-w-[180px]">
                {chatCharacter?.name && `${chatCharacter.name} • `}
                {formatDate(chat.lastMessageAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 group-hover:opacity-100 md:opacity-0"
              onClick={(e) => onDeleteChat(chat, e)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

