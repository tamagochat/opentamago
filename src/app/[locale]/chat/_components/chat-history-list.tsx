"use client";

import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { useChats } from "~/lib/db/hooks";
import type { ChatDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";

interface ChatHistoryListProps {
  characterId: string;
  selectedChat: ChatDocument | null;
  onSelectChat: (chat: ChatDocument) => void;
}

export function ChatHistoryList({
  characterId,
  selectedChat,
  onSelectChat,
}: ChatHistoryListProps) {
  const tLeft = useTranslations("chat.leftPanel");
  const { chats, isLoading: chatsLoading } = useChats(characterId);

  const formatChatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return tLeft("yesterday");
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (chatsLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm min-w-0">
        {tLeft("noChats")}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-w-0 max-w-full">
      <div className="space-y-1 min-w-0 max-w-full">
        {chats.map((chat) => (
          <Button
            key={chat.id}
            variant={selectedChat?.id === chat.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-auto py-3 px-3",
              selectedChat?.id === chat.id && "bg-accent"
            )}
            onClick={() => onSelectChat(chat)}
          >
            <MessageSquare className="text-muted-foreground h-5 w-5 shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="truncate text-sm font-medium">{chat.title}</p>
              <p className="truncate text-muted-foreground text-xs">
                {formatChatDate(chat.lastMessageAt)}
              </p>
            </div>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}

