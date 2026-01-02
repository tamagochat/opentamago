"use client";

import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
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
      <div className="text-muted-foreground p-4 text-center text-sm min-w-0">
        Loading...
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
    <ScrollArea className="max-h-[calc(100vh-400px)] min-w-0 max-w-full">
      <div className="space-y-1 min-w-0 max-w-full">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "hover:bg-accent group flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors min-w-0 max-w-full",
              selectedChat?.id === chat.id && "bg-accent"
            )}
            onClick={() => onSelectChat(chat)}
          >
            <MessageSquare className="text-muted-foreground h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="block truncate text-sm font-medium">{chat.title}</p>
              <p className="text-muted-foreground block truncate text-xs">
                {formatChatDate(chat.lastMessageAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

