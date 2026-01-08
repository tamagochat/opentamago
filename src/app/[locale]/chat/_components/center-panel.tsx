"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Loader2, User, Trash2, Pencil, PanelRight, Box, Plus } from "lucide-react";
import { Sheet, SheetTrigger } from "~/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useMessages, useSettings, usePersonas, useMemories, useCreateMemory, useDeleteMemory, useDatabase } from "~/lib/db/hooks";
import type { CharacterDocument, ChatDocument, PersonaDocument, ChatBubbleTheme } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";
import { PersonaEditor } from "./persona-editor";
import { ChatInput } from "./chat-input";
import { EditMessageDialog } from "./edit-message-dialog";
import { MemoryDialog } from "./memory-dialog";
import { ExperimentalDisclaimer } from "~/components/experimental-disclaimer";
import { toast } from "sonner";
import { createSingleChatContext, generateStreamingResponse, generateMessengerChatResponse } from "~/lib/chat";

// Recursive markdown-style parser for roleplay text
type FormatNode =
  | { type: "text"; content: string }
  | { type: "bold"; children: FormatNode[] }
  | { type: "italic"; children: FormatNode[] }
  | { type: "quote"; children: FormatNode[] };

function parseRoleplayText(text: string): FormatNode[] {
  const nodes: FormatNode[] = [];
  let i = 0;

  while (i < text.length) {
    // Check for bold-italic (***text***)
    if (text.slice(i, i + 3) === "***") {
      const closeIndex = text.indexOf("***", i + 3);
      if (closeIndex !== -1) {
        const innerText = text.slice(i + 3, closeIndex);
        nodes.push({
          type: "bold",
          children: [{ type: "italic", children: parseRoleplayText(innerText) }],
        });
        i = closeIndex + 3;
        continue;
      }
    }

    // Check for bold (**text**)
    if (text.slice(i, i + 2) === "**") {
      const closeIndex = text.indexOf("**", i + 2);
      if (closeIndex !== -1) {
        const innerText = text.slice(i + 2, closeIndex);
        nodes.push({
          type: "bold",
          children: parseRoleplayText(innerText),
        });
        i = closeIndex + 2;
        continue;
      }
    }

    // Check for quotes ("text")
    if (text[i] === '"') {
      const closeIndex = text.indexOf('"', i + 1);
      if (closeIndex !== -1) {
        const innerText = text.slice(i + 1, closeIndex);
        nodes.push({
          type: "quote",
          children: parseRoleplayText(innerText),
        });
        i = closeIndex + 1;
        continue;
      }
    }

    // Check for italic/action (*text*)
    if (text[i] === "*") {
      const closeIndex = text.indexOf("*", i + 1);
      if (closeIndex !== -1) {
        const innerText = text.slice(i + 1, closeIndex);
        nodes.push({
          type: "italic",
          children: parseRoleplayText(innerText),
        });
        i = closeIndex + 1;
        continue;
      }
    }

    // Regular text - collect until next special character
    let textContent = "";
    while (i < text.length && text[i] !== "*" && text[i] !== '"') {
      textContent += text[i];
      i++;
    }
    if (textContent) {
      nodes.push({ type: "text", content: textContent });
    }
  }

  return nodes;
}

function renderFormatNodes(nodes: FormatNode[], keyPrefix = ""): React.ReactNode {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;

    if (node.type === "text") {
      return <span key={key}>{node.content}</span>;
    }

    if (node.type === "bold") {
      return (
        <span key={key} className="font-bold">
          {renderFormatNodes(node.children, key)}
        </span>
      );
    }

    if (node.type === "italic") {
      return (
        <span key={key} className="text-muted-foreground italic">
          {renderFormatNodes(node.children, key)}
        </span>
      );
    }

    if (node.type === "quote") {
      return (
        <span key={key} className="text-primary font-semibold">
          "{renderFormatNodes(node.children, key)}"
        </span>
      );
    }

    return null;
  });
}

// Roleplay text renderer that highlights quotes and formats actions
function RoleplayText({ content }: { content: string }) {
  const parsedContent = useMemo(() => parseRoleplayText(content), [content]);

  return (
    <div className="whitespace-pre-wrap break-words">
      {renderFormatNodes(parsedContent)}
    </div>
  );
}

// Message content renderer based on theme
// Skip expensive parsing during streaming to keep UI responsive
function MessageContent({ content, theme, isStreaming = false }: { content: string; theme: ChatBubbleTheme; isStreaming?: boolean }) {
  if (theme === "messenger") {
    // Plain text - just whitespace preserved
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  // During streaming, show raw text to avoid expensive O(n) parsing on every update
  if (isStreaming) {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  // Roleplay theme - styled quotes and actions (only for complete messages)
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
  rightPanelOpen?: boolean;
  onRightPanelOpenChange?: (open: boolean) => void;
}

export function CenterPanel({ character, chat, className, rightPanelOpen, onRightPanelOpenChange }: CenterPanelProps) {
  const t = useTranslations("chat.centerPanel");
  const { settings, isApiReady, effectiveApiKey, isClientMode } = useSettings();
  const chatBubbleTheme = settings.chatBubbleTheme ?? "roleplay";
  const { personas } = usePersonas();
  const { messages: storedMessages, addMessage, updateMessage, deleteMessage, clearMessages, isLoading: messagesLoading } = useMessages(chat?.id ?? "");
  const { memories, isLoading: memoriesLoading } = useMemories(chat?.id ?? "", 50);
  const { createMemory } = useCreateMemory();
  const { deleteMemory } = useDeleteMemory();
  const { db } = useDatabase();
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaDocument | null>(null);
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Streaming state - separate from displayMessages to avoid frequent re-renders
  const [streamingContent, setStreamingContent] = useState<string>("");
  const streamingContentRef = useRef<string>(""); // Accumulate chunks without re-renders
  const rafIdRef = useRef<number | null>(null); // Track requestAnimationFrame ID

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
    setIsLoading(false);
    // Clear streaming state
    streamingContentRef.current = "";
    setStreamingContent("");
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [chat?.id]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Handle first message for new chats (only if chat is empty after loading)
  useEffect(() => {
    if (
      chat &&
      character &&
      !messagesLoading &&
      storedMessages.length === 0 &&
      character.firstMessage
    ) {
      void addMessage("assistant", character.firstMessage);
    }
  }, [chat, character, messagesLoading, storedMessages.length, addMessage]);

  // Combine stored messages with streaming message for display
  const allMessages = useMemo<DisplayMessage[]>(() => {
    if (streamingContent) {
      return [
        ...displayMessages,
        { id: "streaming", role: "assistant" as const, content: streamingContent },
      ];
    }
    return displayMessages;
  }, [displayMessages, streamingContent]);

  // Auto-scroll to bottom
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (scrollElement) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      });
    }
  }, [allMessages]);

  const handleSubmit = useCallback(async (userMessage: string) => {
    if (!isApiReady || isLoading) return;

    if (!selectedPersona) {
      toast.error(t("selectPersonaToSend"), {
        action: {
          label: t("createPersonaAction"),
          onClick: () => setPersonaEditorOpen(true),
        },
      });
      return;
    }

    if (!character) return;

    setIsLoading(true);

    try {
      // Save user message first (inside try/catch to handle errors)
      await addMessage("user", userMessage);

      // Format memories for context
      const memoryContext = memories.length > 0
        ? memories.map(m => m.content).join('\n')
        : undefined;

      const context = createSingleChatContext({
        character,
        persona: selectedPersona,
        messages: storedMessages,
        theme: chatBubbleTheme,
        enableLorebook: false, // TODO: Enable when lorebook UI is ready
        enableMemory: chatBubbleTheme === "messenger" && memories.length > 0,
        memoryContext,
      });

      // Check if messenger mode is active
      const isMessengerMode = chatBubbleTheme === "messenger";

      if (isMessengerMode) {
        // Messenger mode: Generate structured JSON response
        const messengerResponse = await generateMessengerChatResponse({
          context,
          userMessage,
          apiKey: effectiveApiKey,
          model: settings.defaultModel,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          safetySettings: settings.safetySettings,
          isClientMode,
        });

        // Save each message to database (ignoring delays)
        for (const msg of messengerResponse.messages) {
          await addMessage("assistant", msg.content);
        }

        // Save memory if provided
        if (messengerResponse.memory) {
          // TODO: Save to memories collection
          console.log("Memory:", messengerResponse.memory);
        }
      } else {
        // Roleplay mode: Stream response with throttled UI updates
        console.log("[Roleplay] Starting stream generation...");

        // Reset streaming state
        streamingContentRef.current = "";
        setStreamingContent("");

        console.log("[Roleplay] Creating stream generator...");
        const stream = generateStreamingResponse({
          context,
          userMessage,
          apiKey: effectiveApiKey,
          model: settings.defaultModel,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          safetySettings: settings.safetySettings,
          isClientMode,
        });
        console.log("[Roleplay] Stream generator created, starting iteration...");

        // Throttle UI updates: only update when content actually changes
        let lastUpdateTime = 0;
        let chunkCount = 0;
        const UPDATE_INTERVAL = 50; // ms - update UI at most every 50ms

        for await (const chunk of stream) {
          chunkCount++;
          if (chunkCount === 1) {
            console.log("[Roleplay] Received first chunk");
          }
          streamingContentRef.current += chunk;

          // Throttle state updates
          const now = Date.now();
          if (now - lastUpdateTime >= UPDATE_INTERVAL) {
            setStreamingContent(streamingContentRef.current);
            lastUpdateTime = now;

            // CRITICAL: Yield to macrotask queue to allow click handlers to run.
            // Without this, rapid microtask processing from for-await starves the event loop,
            // preventing any UI interactions (clicks, scrolls) from being processed.
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        console.log(`[Roleplay] Stream complete. Total chunks: ${chunkCount}`);

        // Final update to ensure all content is displayed
        setStreamingContent(streamingContentRef.current);

        // Save assistant message and clear streaming state
        const fullContent = streamingContentRef.current;
        streamingContentRef.current = "";
        setStreamingContent("");

        console.log("[Roleplay] Saving assistant message...");
        if (fullContent) {
          await addMessage("assistant", fullContent);
        }
        console.log("[Roleplay] Done!");
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Clear streaming state on error
      streamingContentRef.current = "";
      setStreamingContent("");
    } finally {
      // Cleanup RAF if running
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      setIsLoading(false);
    }
  }, [isApiReady, isLoading, selectedPersona, character, t, addMessage, memories, storedMessages, chatBubbleTheme, effectiveApiKey, settings, isClientMode]);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      // Don't delete streaming messages
      if (messageId.startsWith("streaming-")) {
        return;
      }

      await deleteMessage(messageId);
      // Note: No need to manually update displayMessages
      // The RxDB subscription in useMessages will automatically update storedMessages,
      // which will trigger the useEffect that syncs to displayMessages
    },
    [deleteMessage]
  );

  const handleStartEdit = useCallback((messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditingMessageContent(currentContent);
  }, []);

  const handleSaveEdit = useCallback(async (newContent: string) => {
    if (!editingMessageId) return;

    await updateMessage(editingMessageId, newContent);
    // Note: No need to manually update displayMessages
    // The RxDB subscription will automatically sync the updated message

    setEditingMessageId(null);
    setEditingMessageContent("");
  }, [editingMessageId, updateMessage]);

  if (!character || !chat) {
    return (
      <div className={cn("flex h-full flex-col", className)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 max-w-2xl mx-auto">
          <ExperimentalDisclaimer type="chat" />
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
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <div className="text-center">
            <p className="text-lg font-medium">{t("apiKeyRequired")}</p>
            <p className="text-muted-foreground text-sm">
              {t("configureApiKey")}
            </p>
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
          <Button variant="ghost" size="icon" onClick={() => setMemoryDialogOpen(true)} title="Chat Memory">
            <Box className="h-4 w-4" />
          </Button>
          {/* Right Panel Toggle for Tablet/Desktop (md to lg) */}
          <Sheet open={rightPanelOpen} onOpenChange={onRightPanelOpenChange}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden md:flex lg:hidden">
                <PanelRight className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          </Sheet>
        </div>
      </div>

      {/* Messages - Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {allMessages
              .filter((m) => m.role !== "system")
              .map((message, index, filteredMessages) => {
                // Check if this is the last message in a group from the same sender
                const prevMessage = filteredMessages[index - 1];
                const nextMessage = filteredMessages[index + 1];
                const isFirstInGroup = !prevMessage || prevMessage.role !== message.role;
                const isLastInGroup = !nextMessage || nextMessage.role !== message.role;
                const isSingleMessage = isFirstInGroup && isLastInGroup;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2 group items-center",
                      message.role === "user" ? "flex-row-reverse" : "flex-row",
                      !isLastInGroup && "mb-0.5" // Reduced spacing between grouped messages
                    )}
                  >
                    {/* Avatar - only show for last message in group */}
                    {isLastInGroup ? (
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
                    ) : (
                      <div className="h-8 w-8 shrink-0" />
                    )}

                    <div className="flex flex-col gap-1 max-w-[480px] min-w-0">
                      <div
                        className={cn(
                          "px-4 py-2",
                          message.role === "user"
                            ? "bg-white dark:bg-primary text-foreground dark:text-primary-foreground border border-border dark:border-transparent"
                            : "bg-muted",
                          // Border radius based on position in group
                          message.role === "user"
                            ? cn(
                                isSingleMessage && "rounded-2xl",
                                isFirstInGroup && !isSingleMessage && "rounded-2xl rounded-br-md",
                                !isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-r-md",
                                isLastInGroup && !isSingleMessage && "rounded-2xl rounded-tr-md"
                              )
                            : cn(
                                isSingleMessage && "rounded-2xl",
                                isFirstInGroup && !isSingleMessage && "rounded-2xl rounded-bl-md",
                                !isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-l-md",
                                isLastInGroup && !isSingleMessage && "rounded-2xl rounded-tl-md"
                              )
                        )}
                      >
                        <div className="text-sm leading-relaxed">
                          <MessageContent
                            content={message.content}
                            theme={chatBubbleTheme}
                            isStreaming={message.id === "streaming"}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Edit/Delete buttons - appear on the left for user, right for assistant */}
                    {!message.id.startsWith("streaming-") && (
                      <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleStartEdit(message.id, message.content)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteMessage(message.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Loading indicator - show when loading but no streaming content yet */}
            {isLoading && !streamingContent && (
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
      <ChatInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholder={t("messagePlaceholder", { name: character.name })}
        personas={personas}
        selectedPersona={selectedPersona}
        onPersonaSelect={setSelectedPersona}
        onCreatePersona={() => setPersonaEditorOpen(true)}
        translations={{
          selectPersona: t("selectPersona"),
          noPersonas: t("noPersonas"),
          createPersona: t("createPersona"),
        }}
      />

      {/* Persona Editor Dialog */}
      <PersonaEditor
        open={personaEditorOpen}
        onOpenChange={setPersonaEditorOpen}
        onSave={(persona) => setSelectedPersona(persona)}
      />

      {/* Edit Message Dialog */}
      <EditMessageDialog
        open={editingMessageId !== null}
        onOpenChange={(open) => !open && setEditingMessageId(null)}
        initialContent={editingMessageContent}
        onSave={handleSaveEdit}
      />

      {/* Memory Dialog */}
      <MemoryDialog
        open={memoryDialogOpen}
        onOpenChange={setMemoryDialogOpen}
        memories={memories}
        memoriesLoading={memoriesLoading}
        chatId={chat.id}
        characterId={character.id}
        db={db}
        onCreateMemory={createMemory}
        onDeleteMemory={deleteMemory}
      />
    </div>
  );
}
