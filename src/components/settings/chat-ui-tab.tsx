"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Label } from "~/components/ui/label";
import type { ChatBubbleTheme } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";

export interface ChatUITabSaveData {
  chatBubbleTheme: ChatBubbleTheme;
}

export interface ChatUITabRef {
  getSaveData: () => ChatUITabSaveData;
}

interface ChatUITabProps {
  initialChatBubbleTheme: ChatBubbleTheme;
}

export const ChatUITab = forwardRef<ChatUITabRef, ChatUITabProps>(
  function ChatUITab({ initialChatBubbleTheme }, ref) {
    const t = useTranslations("chat.settings");
    const [chatBubbleTheme, setChatBubbleTheme] = useState<ChatBubbleTheme>(initialChatBubbleTheme);

    // Sync with initial values when they change
    useEffect(() => {
      setChatBubbleTheme(initialChatBubbleTheme);
    }, [initialChatBubbleTheme]);

    useImperativeHandle(ref, () => ({
      getSaveData: () => ({
        chatBubbleTheme,
      }),
    }));

    return (
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-medium mb-1">{t("chatUISection")}</h3>
          <p className="text-muted-foreground text-xs">{t("chatUIDescription")}</p>
        </div>

        {/* Chat Bubble Theme */}
        <div className="grid gap-3">
          <Label>{t("bubbleTheme")}</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setChatBubbleTheme("roleplay")}
              className={cn(
                "flex flex-col gap-2 rounded-lg border-2 p-4 transition-colors",
                chatBubbleTheme === "roleplay"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              )}
            >
              <div className="text-left">
                <p className="font-medium text-sm">{t("themeRoleplay")}</p>
                <p className="text-xs text-muted-foreground">{t("themeRoleplayDesc")}</p>
              </div>
              {/* Preview */}
              <div className="bg-muted rounded-lg p-2 text-xs space-y-1">
                <p><span className="text-primary">&quot;Hello!&quot;</span> she said softly.</p>
                <p className="border-l-2 border-muted-foreground/30 pl-2 text-muted-foreground italic">*smiles warmly*</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setChatBubbleTheme("messenger")}
              className={cn(
                "flex flex-col gap-2 rounded-lg border-2 p-4 transition-colors",
                chatBubbleTheme === "messenger"
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-muted-foreground/50"
              )}
            >
              <div className="text-left">
                <p className="font-medium text-sm">{t("themeMessenger")}</p>
                <p className="text-xs text-muted-foreground">{t("themeMessengerDesc")}</p>
              </div>
              {/* Preview */}
              <div className="bg-muted rounded-lg p-2 text-xs">
                <p>&quot;Hello!&quot; she said softly.</p>
                <p>*smiles warmly*</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }
);
