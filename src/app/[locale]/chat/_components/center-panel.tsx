"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Send, Loader2, User, Trash2, UserCircle, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useMessages, useSettings, usePersonas } from "~/lib/db/hooks";
import type { CharacterDocument, ChatDocument, PersonaDocument, ChatBubbleTheme } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";
import { streamChatResponse } from "~/lib/ai";
import { LocaleSwitcher } from "~/components/locale-switcher";
import { ThemeToggle } from "~/components/theme-toggle";
import { PersonaEditor } from "./persona-editor";
import { toast } from "sonner";

// Roleplay text renderer that highlights quotes and formats actions
function RoleplayText({ content }: { content: string }) {
  const parts = useMemo(() => {
    const result: { type: "text" | "quote" | "action"; content: string }[] = [];
    // Match double quotes, single quotes for dialogue, and asterisks for actions
    const regex = /("([^"]+)")|(\*([^*]+)\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before this match
      if (match.index > lastIndex) {
        result.push({ type: "text", content: content.slice(lastIndex, match.index) });
      }

      if (match[1]) {
        // Double quoted dialogue
        result.push({ type: "quote", content: match[1] });
      } else if (match[3]) {
        // Asterisk action
        result.push({ type: "action", content: match[3] });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      result.push({ type: "text", content: content.slice(lastIndex) });
    }

    return result;
  }, [content]);

  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.type === "quote") {
          return (
            <span key={i} className="text-primary font-medium">
              {part.content}
            </span>
          );
        }
        if (part.type === "action") {
          return (
            <span key={i} className="text-muted-foreground italic">
              *{part.content}*
            </span>
          );
        }
        return <span key={i}>{part.content}</span>;
      })}
    </div>
  );
}

// Message content renderer based on theme
function MessageContent({ content, theme }: { content: string; theme: ChatBubbleTheme }) {
  if (theme === "messenger") {
    // Plain text - just whitespace preserved
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  // Roleplay theme - styled quotes and actions
  return <RoleplayText content={content} />;
}

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
  const { settings, isApiReady, effectiveApiKey, isClientMode } = useSettings();
  const chatBubbleTheme = settings.chatBubbleTheme ?? "roleplay";
  const { personas } = usePersonas();
  const { messages: storedMessages, addMessage, clearMessages } = useMessages(chat?.id ?? "");
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaDocument | null>(null);
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
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
    if (!inputValue.trim() || !isApiReady || isLoading) return;

    if (!selectedPersona) {
      toast.error(t("selectPersonaToSend"));
      return;
    }

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
      // Add placeholder message for streaming
      const streamingId = `streaming-${Date.now()}`;
      setDisplayMessages((prev) => [
        ...prev,
        { id: streamingId, role: "assistant", content: "" },
      ]);

      let fullContent = "";
      const stream = streamChatResponse({
        messages: messagesForAPI,
        apiKey: effectiveApiKey,
        model: settings.defaultModel,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        safetySettings: settings.safetySettings,
        isClientMode,
      });

      for await (const chunk of stream) {
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
      <div className={cn("flex h-full flex-col", className)}>
        <div className="hidden md:flex shrink-0 items-center justify-end px-4 py-3 gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <div className="text-muted-foreground text-center">
            <p className="text-lg font-medium">{t("selectCharacter")}</p>
            <p className="text-sm">{t("createFromLeft")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isApiReady) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <div className="hidden md:flex shrink-0 items-center justify-end px-4 py-3 gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <div className="text-center">
            <p className="text-lg font-medium">{t("apiKeyRequired")}</p>
            <p className="text-muted-foreground mb-4 text-sm">
              {t("configureApiKey")}
            </p>
            <Button onClick={onOpenSettings}>{t("openSettings")}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col min-h-0", className)}>
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
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
          <div className="hidden md:flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
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
                    <div className="text-sm leading-relaxed">
                      <MessageContent content={message.content} theme={chatBubbleTheme} />
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
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          {/* Persona Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "shrink-0 h-[44px] w-[44px] p-0",
                  !selectedPersona && "text-muted-foreground"
                )}
                title={selectedPersona?.name ?? t("selectPersona")}
              >
                {selectedPersona ? (
                  <Avatar className="h-6 w-6">
                    {selectedPersona.avatarData ? (
                      <AvatarImage src={selectedPersona.avatarData} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {selectedPersona.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <UserCircle className="h-5 w-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {personas.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  {t("noPersonas")}
                </div>
              ) : (
                personas.map((persona) => (
                  <DropdownMenuItem
                    key={persona.id}
                    onClick={() => setSelectedPersona(persona)}
                    className={cn(
                      "flex items-center gap-2",
                      selectedPersona?.id === persona.id && "bg-accent"
                    )}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      {persona.avatarData ? (
                        <AvatarImage src={persona.avatarData} />
                      ) : null}
                      <AvatarFallback className="text-xs">
                        {persona.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{persona.name}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPersonaEditorOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createPersona")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("messagePlaceholder", { name: character.name })}
            className="max-h-32 min-h-[44px] resize-none"
            rows={1}
          />
          <Button
            type="submit"
            className="shrink-0 h-[44px] w-[44px] p-0"
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      {/* Persona Editor Dialog */}
      <PersonaEditor
        open={personaEditorOpen}
        onOpenChange={setPersonaEditorOpen}
        onSave={(persona) => setSelectedPersona(persona)}
      />
    </div>
  );
}
