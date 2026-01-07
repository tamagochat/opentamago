"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { MessageSquare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { useChats } from "~/lib/db/hooks";
import type { CharacterDocument, ChatDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

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
  const tActions = useTranslations("actions");
  const tCommon = useTranslations("common");
  const { chats: allChats, isLoading: allChatsLoading, updateChat } = useChats();
  const [editingChat, setEditingChat] = useState<ChatDocument | null>(null);
  const [editTitle, setEditTitle] = useState("");

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

  const handleEditClick = (chat: ChatDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChat(chat);
    setEditTitle(chat.title);
  };

  const handleSaveEdit = async () => {
    if (!editingChat || !editTitle.trim()) return;

    try {
      await updateChat(editingChat.id, { title: editTitle.trim() });
      toast.success("Chat title updated");
      setEditingChat(null);
      setEditTitle("");
    } catch (error) {
      console.error("Failed to update chat title:", error);
      toast.error("Failed to update chat title");
    }
  };

  const handleCancelEdit = () => {
    setEditingChat(null);
    setEditTitle("");
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 group-hover:opacity-100 md:opacity-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
                <DropdownMenuItem onClick={(e) => handleEditClick(chat, e)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {tActions("edit")} {t("chatTitle")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => onDeleteChat(chat, e)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tActions("delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      })}

      {/* Edit Chat Title Dialog */}
      <Dialog open={editingChat !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{tActions("edit")} {t("chatTitle")}</DialogTitle>
            <DialogDescription>
              {t("editChatTitleDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={t("chatTitlePlaceholder")}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && editTitle.trim()) {
                  void handleSaveEdit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              {tActions("cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editTitle.trim()}>
              {tActions("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

