"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Send, Loader2, User, Trash2, UserCircle, Plus, Pencil, PanelRight, Box } from "lucide-react";
import { Sheet, SheetTrigger } from "~/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useMessages, useSettings, usePersonas, useMemories, useCreateMemory, useDeleteMemory, useDatabase } from "~/lib/db/hooks";
import type { CharacterDocument, ChatDocument, PersonaDocument, ChatBubbleTheme } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";
import { PersonaEditor } from "./persona-editor";
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
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaDocument | null>(null);
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);
  const [newMemory, setNewMemory] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false); // Track IME composition state

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
  }, [chat?.id]);

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

    // Don't submit while IME composition is active (CJK input)
    if (isComposingRef.current) return;

    if (!inputValue.trim() || !isApiReady || isLoading) return;

    if (!selectedPersona) {
      toast.error(t("selectPersonaToSend"), {
        action: {
          label: t("createPersonaAction"),
          onClick: () => setPersonaEditorOpen(true),
        },
      });
      return;
    }

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    // Save user message
    await addMessage("user", userMessage);

    try {
      // Create generation context
      if (!character) return;

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
        // Roleplay mode: Stream response
        const streamingId = `streaming-${Date.now()}`;
        setDisplayMessages((prev) => [
          ...prev,
          { id: streamingId, role: "assistant", content: "" },
        ]);

        let fullContent = "";
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
    // Don't submit on Enter if IME composition is active
    if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
      e.preventDefault();
      void onSubmit(e);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };


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
    setEditingContent(currentContent);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId || !editingContent.trim()) return;

    await updateMessage(editingMessageId, editingContent.trim());
    // Note: No need to manually update displayMessages
    // The RxDB subscription will automatically sync the updated message

    setEditingMessageId(null);
    setEditingContent("");
  }, [editingMessageId, editingContent, updateMessage]);

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
            {displayMessages
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
                          <MessageContent content={message.content} theme={chatBubbleTheme} />
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

            {/* Loading indicator */}
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
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
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

      {/* Edit Message Dialog */}
      <Dialog open={editingMessageId !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Modify the message content. This will update the chat history used for AI responses.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="Message content..."
              className="min-h-[150px] resize-none"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editingContent.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Memory Dialog */}
      <Dialog open={memoryDialogOpen} onOpenChange={setMemoryDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Chat Memory</DialogTitle>
            <DialogDescription>
              Important facts and context that the AI remembers about this conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Memories List */}
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-2">
                {memoriesLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    Loading memories...
                  </div>
                ) : memories.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No memories saved yet.
                    <br />
                    <span className="text-xs">
                      Memories will be automatically extracted from your conversations when using Messenger mode.
                    </span>
                  </div>
                ) : (
                  memories.map((memory) => {
                    const createdDate = new Date(memory.createdAt);
                    const now = new Date();
                    const diffMs = now.getTime() - createdDate.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);

                    let timeAgo = "";
                    if (diffMins < 1) timeAgo = "Just now";
                    else if (diffMins < 60) timeAgo = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
                    else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
                    else timeAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

                    const isEditing = editingMemoryId === memory.id;

                    return (
                      <div key={memory.id} className="group rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                        {isEditing ? (
                          // Edit mode
                          <div className="space-y-2">
                            <Textarea
                              value={editingMemoryContent}
                              onChange={(e) => setEditingMemoryContent(e.target.value)}
                              className="min-h-[80px] resize-none"
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingMemoryId(null);
                                  setEditingMemoryContent("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={async () => {
                                  if (!editingMemoryContent.trim()) return;
                                  try {
                                    // Update memory in database
                                    const memoryDoc = await db?.memories.findOne(memory.id).exec();
                                    if (memoryDoc) {
                                      await memoryDoc.patch({ content: editingMemoryContent.trim() });
                                      toast.success("Memory updated!");
                                      setEditingMemoryId(null);
                                      setEditingMemoryContent("");
                                    }
                                  } catch (error) {
                                    console.error("Failed to update memory:", error);
                                    toast.error("Failed to update memory");
                                  }
                                }}
                                disabled={!editingMemoryContent.trim()}
                              >
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <>
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm flex-1">{memory.content}</p>
                              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setEditingMemoryId(memory.id);
                                    setEditingMemoryContent(memory.content);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => deleteMemory(memory.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Add New Memory */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Add New Memory</label>
              <div className="flex gap-2">
                <Textarea
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder="Type a fact or context to remember..."
                  className="min-h-[80px] resize-none flex-1"
                />
              </div>
              <Button
                onClick={async () => {
                  if (newMemory.trim() && chat && character) {
                    try {
                      await createMemory({
                        chatId: chat.id,
                        characterId: character.id,
                        content: newMemory.trim(),
                      });
                      toast.success("Memory added!");
                      setNewMemory("");
                    } catch (error) {
                      console.error("Failed to add memory:", error);
                      toast.error("Failed to add memory");
                    }
                  }
                }}
                disabled={!newMemory.trim() || !chat || !character}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Memory
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
