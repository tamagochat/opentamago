"use client";

import { memo } from "react";
import { Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { useAssistantActionsContext } from "./assistant-context";

// Header component - subscribes only to hasMessages and clearMessages
export const AssistantHeader = memo(function AssistantHeader() {
  const t = useTranslations("charxEditor.assistant");
  const { hasMessages, clearMessages } = useAssistantActionsContext();

  return (
    <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="font-medium">{t("title")}</h2>
      </div>
      {hasMessages && (
        <Button variant="ghost" size="sm" onClick={clearMessages} className="h-8 px-2">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
});
