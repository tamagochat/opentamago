"use client";

import { useRef, useEffect, useCallback, memo } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useActionsContext } from "./editor-context";
import {
  useMessagesContext,
  useLoadingContext,
  useApiKeyContext,
  useAssistantActionsContext,
} from "./assistant-context";
import { AssistantMessageItem } from "./assistant-message";

const EXAMPLE_PROMPTS = [
  { key: "personality", icon: "🎭" },
  { key: "dialogue", icon: "💬" },
  { key: "lorebook", icon: "📚" },
  { key: "improve", icon: "✨" },
];

// Main scrollable messages area - subscribes to messages
export const AssistantMessagesArea = memo(function AssistantMessagesArea() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages } = useMessagesContext();
  const { isLoading } = useLoadingContext();
  const { missingApiKey } = useApiKeyContext();
  const { sendMessage } = useAssistantActionsContext();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (scrollElement) {
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      });
    }
  }, [messages]);

  const handleExampleClick = useCallback(
    (prompt: string) => {
      if (missingApiKey) return;
      void sendMessage(prompt);
    },
    [sendMessage, missingApiKey]
  );

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <ScrollArea className="h-full p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <ExamplePrompts onSelect={handleExampleClick} disabled={!!missingApiKey} />
        ) : (
          <MessagesList />
        )}
      </ScrollArea>
    </div>
  );
});

// Example prompts - shown when no messages
const ExamplePrompts = memo(function ExamplePrompts({
  onSelect,
  disabled,
}: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("charxEditor.assistant");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        {t("placeholder")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {EXAMPLE_PROMPTS.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => onSelect(t(`examples.${key}`))}
            disabled={disabled}
            className="text-left p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-lg mr-2">{icon}</span>
            <span className="text-xs text-muted-foreground line-clamp-2">
              {t(`examples.${key}`)}
            </span>
          </button>
        ))}
      </div>
      {/* Disclaimer about chat history */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          {t("chatHistoryDisclaimer")}
        </p>
      </div>
    </div>
  );
});

// Messages list - renders all messages
const MessagesList = memo(function MessagesList() {
  const t = useTranslations("charxEditor.assistant");
  const { messages } = useMessagesContext();
  const { isLoading } = useLoadingContext();
  const { generateImageFromPrompt } = useAssistantActionsContext();
  const { copyToField, copyToLorebook, addAssetFromAI, setAvatarFromAI } = useActionsContext();

  // Check if showing loading indicator (last message is empty assistant message)
  const lastMessage = messages[messages.length - 1];
  const showThinking = isLoading && lastMessage?.role === "assistant" && lastMessage.content === "";

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <AssistantMessageItem
          key={message.id}
          message={message}
          onCopyToField={copyToField}
          onCopyToLorebook={copyToLorebook}
          onAddAsset={addAssetFromAI}
          onSetAvatar={setAvatarFromAI}
          onGenerateImage={generateImageFromPrompt}
          isLoading={isLoading && message.role === "assistant" && message.content === ""}
        />
      ))}
      {showThinking && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t("thinking")}</span>
        </div>
      )}
    </div>
  );
});
