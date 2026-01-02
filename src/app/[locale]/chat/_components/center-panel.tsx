"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Send, Loader2, User, Trash2 } from "lucide-react";
import { useMessages, useSettings } from "~/lib/db/hooks";
import type { CharacterDocument, ChatDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface CenterPanelProps {
  character: CharacterDocument | null;
  chat: ChatDocument | null;
  className?: string;
  onOpenSettings: () => void;
}

export function CenterPanel({ character, chat, className, onOpenSettings }: CenterPanelProps) {
  const t = useTranslations("chat.centerPanel");
  const { settings, hasApiKey } = useSettings();
  const { messages: storedMessages, addMessage, clearMessages } = useMessages(chat?.id ?? "");
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedFirstMessage = useRef(false);

  const buildSystemPrompt = useCallback(() => {
    if (!character) return "";

    if (character.systemPrompt) {
      return character.systemPrompt;
    }

    const parts: string[] = [];

    parts.push(`You are ${character.name}.`);

    if (character.description) {
      parts.push(character.description);
    }

    if (character.personality) {
      parts.push(`Personality: ${character.personality}`);
    }

    if (character.scenario) {
      parts.push(`Scenario: ${character.scenario}`);
    }

    if (character.exampleDialogue) {
      parts.push(`Example dialogue:\n${character.exampleDialogue}`);
    }

    parts.push("Stay in character at all times. Respond naturally as this character would.");

    return parts.join("\n\n");
  }, [character]);

  // Sync stored messages to display
  useEffect(() => {
    const msgs: DisplayMessage[] = storedMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    }));
    setDisplayMessages(msgs);
  }, [storedMessages]);

  // Reset when chat changes
  useEffect(() => {
    setInputValue("");
    setIsLoading(false);
    hasInitializedFirstMessage.current = false;
  }, [chat?.id]);

  // Handle first message for new chats
  useEffect(() => {
    if (
      chat &&
      character &&
      storedMessages.length === 0 &&
      character.firstMessage &&
      !hasInitializedFirstMessage.current
    ) {
      hasInitializedFirstMessage.current = true;
      void addMessage("assistant", character.firstMessage);
    }
  }, [chat, character, storedMessages.length, addMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (scrollElement) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      });
    }
  }, [displayMessages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !hasApiKey || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Save user message
    await addMessage("user", userMessage);

    // Build messages array with system prompt
    const systemPrompt = buildSystemPrompt();
    const messagesForAPI = [
      { role: "system" as const, content: systemPrompt },
      ...storedMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: userMessage },
    ];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForAPI,
          apiKey: settings.geminiApiKey,
          model: settings.defaultModel,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          safetySettings: settings.safetySettings,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      // Add placeholder message for streaming
      const streamingId = `streaming-${Date.now()}`;
      setDisplayMessages((prev) => [
        ...prev,
        { id: streamingId, role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullContent += chunk;

        setDisplayMessages((prev) =>
          prev.map((m) => (m.id === streamingId ? { ...m, content: fullContent } : m))
        );
      }

      // Save assistant message
      if (fullContent) {
        await addMessage("assistant", fullContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Remove streaming message on error
      setDisplayMessages((prev) => prev.filter((m) => !m.id.startsWith("streaming-")));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSubmit(e);
    }
  };

  const handleClearChat = async () => {
    if (confirm(t("clearAllMessages"))) {
      await clearMessages();
      setDisplayMessages([]);
    }
  };

  if (!character || !chat) {
    return (
      <div
        className={cn("flex h-full flex-col items-center justify-center gap-4 p-8", className)}
      >
        <div className="text-muted-foreground text-center">
          <p className="text-lg font-medium">{t("selectCharacter")}</p>
          <p className="text-sm">{t("createFromLeft")}</p>
        </div>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div
        className={cn("flex h-full flex-col items-center justify-center gap-4 p-8", className)}
      >
        <div className="text-center">
          <p className="text-lg font-medium">{t("apiKeyRequired")}</p>
          <p className="text-muted-foreground mb-4 text-sm">
            {t("configureApiKey")}
          </p>
          <Button onClick={onOpenSettings}>{t("openSettings")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col min-h-0", className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={character.avatarData} />
            <AvatarFallback>{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{character.name}</p>
            <p className="text-muted-foreground truncate text-xs">{chat.title}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleClearChat} title={t("clearChat")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages - Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {displayMessages
              .filter((m) => m.role !== "system")
              .map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    {message.role === "user" ? (
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src={character.avatarData} />
                        <AvatarFallback>{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </>
                    )}
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2 min-w-0",
                      message.role === "user" 
                        ? "bg-white dark:bg-primary text-foreground dark:text-primary-foreground border border-border dark:border-transparent" 
                        : "bg-muted"
                    )}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-p:my-1 prose-p:leading-relaxed prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
            {isLoading && !displayMessages.some((m) => m.id.startsWith("streaming-")) && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={character.avatarData} />
                  <AvatarFallback>{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="bg-muted flex items-center gap-2 rounded-2xl px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">{t("thinking")}</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input - Fixed at Bottom */}
      <div className="shrink-0 border-t bg-background p-4">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("messagePlaceholder", { name: character.name })}
            className="max-h-32 min-h-[44px] resize-none"
            rows={1}
          />
          <Button type="submit" size="icon" disabled={!inputValue.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
