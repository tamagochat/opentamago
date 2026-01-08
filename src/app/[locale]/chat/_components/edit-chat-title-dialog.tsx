"use client";

import { useState, useCallback, memo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
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
import type { ChatDocument } from "~/lib/db/schemas";
import { toast } from "sonner";

interface EditChatTitleDialogProps {
  chat: ChatDocument | null;
  onClose: () => void;
}

function EditChatTitleDialogInner({ chat, onClose }: EditChatTitleDialogProps) {
  const t = useTranslations("chat.leftPanel");
  const tActions = useTranslations("actions");
  const { updateChat } = useChats();
  const [title, setTitle] = useState(chat?.title ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!chat || !title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await updateChat(chat.id, { title: title.trim() });
      toast.success("Chat title updated");
      onClose();
    } catch (error) {
      console.error("Failed to update chat title:", error);
      toast.error("Failed to update chat title");
    } finally {
      setIsSaving(false);
    }
  }, [chat, title, isSaving, updateChat, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && title.trim()) {
        void handleSave();
      }
    },
    [title, handleSave]
  );

  return (
    <Dialog open={chat !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {tActions("edit")} {t("chatTitle")}
          </DialogTitle>
          <DialogDescription>{t("editChatTitleDescription")}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("chatTitlePlaceholder")}
            autoFocus
            onKeyDown={handleKeyDown}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {tActions("cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
          >
            {tActions("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const EditChatTitleDialog = memo(EditChatTitleDialogInner);
