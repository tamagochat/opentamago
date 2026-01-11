"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Loader2, PanelRight, Box, ChevronRight, Sparkles, MessageSquare, ChevronUp, ChevronDown, Image, Volume2, Languages, Bot, MessageCircle, Check, X } from "lucide-react";
import { Sheet, SheetTrigger } from "~/components/ui/sheet";
import { useMessages, useSettings, usePersonas, useMemories, useLRUMemory, useDeleteMemory, useDatabase, formatMemoriesForPrompt, useCharacterAssets, useProviderSettings, useGenerationSettings, useChats } from "~/lib/db/hooks";
import type { CharacterDocument, ChatDocument, PersonaDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";
import { ChatInput } from "./chat-input";
import { ExperimentalDisclaimer } from "~/components/experimental-disclaimer";
import { toast } from "sonner";
import { createSingleChatContext, generateStreamingResponse, generateMessengerChatResponse } from "~/lib/chat";
import { translateText, generateImagePrompt, generateImage, generateSpeech } from "~/lib/ai/client";
import { PROVIDER_CONFIGS, type ImageProvider, type VoiceProvider } from "~/lib/ai/providers";
import { MessageBubble, type DisplayMessage, type AssetContext } from "./message-bubble";
import { ChatDialogsProvider, useChatDialogs } from "./chat-dialogs";

interface CenterPanelProps {
  character: CharacterDocument | null;
  chat: ChatDocument | null;
  onSelectChat?: (chat: ChatDocument) => void;
  className?: string;
  rightPanelOpen?: boolean;
  onRightPanelOpenChange?: (open: boolean) => void;
}

// Inner component that uses the dialog context
function CenterPanelInner({ character, chat, onSelectChat, className, rightPanelOpen, onRightPanelOpenChange }: CenterPanelProps) {
  const t = useTranslations("chat.centerPanel");
  const { settings } = useSettings();
  const chatBubbleTheme = settings.chatBubbleTheme ?? "roleplay";
  const { personas } = usePersonas();
  const { messages: storedMessages, addMessage, updateMessage, deleteMessage, setTranslation, addAttachment, getAttachmentDataUrl, getAttachmentBlob, isLoading: messagesLoading, hasMore, isLoadingMore, loadMore } = useMessages(chat?.id ?? "");
  const { memories } = useMemories(chat?.id ?? "", 50);
  const lruMemory = useLRUMemory(chat?.id ?? "", character?.id ?? "");
  const { providers } = useProviderSettings();
  const { getChatSettings, getSettings } = useGenerationSettings();

  // Get chat dialogs from context
  const { openEditDialog, openMemoryDialog, openPersonaEditor } = useChatDialogs();

  // Get chat generation settings and check if provider is ready
  const chatGenSettings = getChatSettings();
  const chatProviderId = (chatGenSettings?.providerId ?? "gemini") as "gemini" | "openrouter" | "anthropic" | "grok" | "openai" | "nanogpt";
  const chatProviderSettings = providers.get(chatProviderId);
  const { isProviderReady } = useProviderSettings();
  const isApiReady = isProviderReady(chatProviderId);

  // Translation state - only tracks loading state, view state is in MessageBubble
  const [isTranslating, setIsTranslating] = useState<Record<string, boolean>>({});

  // Image generation state - tracks which message is currently generating an image
  const [isGeneratingImage, setIsGeneratingImage] = useState<Record<string, boolean>>({});

  // Voice generation state - tracks which message is currently generating voice
  const [isGeneratingVoice, setIsGeneratingVoice] = useState<Record<string, boolean>>({});


  // Character assets for image rendering in roleplay messages
  const { assets, findAssetByName, getAssetDataUrl } = useCharacterAssets(character?.id);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});

  // Load asset data URLs when assets change
  useEffect(() => {
    const loadAssetUrls = async () => {
      const urls: Record<string, string> = {};
      for (const asset of assets) {
        const url = await getAssetDataUrl(asset.id);
        if (url) {
          urls[asset.id] = url;
        }
      }
      setAssetUrls(urls);
    };

    if (assets.length > 0) {
      void loadAssetUrls();
    } else {
      setAssetUrls({});
    }
  }, [assets, getAssetDataUrl]);

  // Memoize asset context to avoid unnecessary re-renders
  const assetContext = useMemo<AssetContext | undefined>(() => {
    if (assets.length === 0) return undefined;
    return { findAssetByName, assetUrls };
  }, [assets.length, findAssetByName, assetUrls]);

  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaDocument | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Streaming state - separate from displayMessages to avoid frequent re-renders
  const [streamingContent, setStreamingContent] = useState<string>("");
  const streamingContentRef = useRef<string>(""); // Accumulate chunks without re-renders
  const rafIdRef = useRef<number | null>(null); // Track requestAnimationFrame ID

  // Model info overlay - shows until user sends first message
  const [showModelOverlay, setShowModelOverlay] = useState(true);
  const [overlayExpanded, setOverlayExpanded] = useState(false);

  // Get all generation settings for expanded view
  const { settings: allGenSettings } = useGenerationSettings();

  // Sync stored messages to display
  useEffect(() => {
    const msgs: DisplayMessage[] = storedMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      reasoning: m.reasoning,
      displayedContent: m.displayedContent,
      displayedContentLanguage: m.displayedContentLanguage,
      attachmentsMeta: m.attachmentsMeta,
      tokenUsage: m.tokenUsage,
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
    // Show model overlay for new chat (collapsed by default)
    setShowModelOverlay(true);
    setOverlayExpanded(false);
  }, [chat?.id]);

  // Initialize selectedPersona when chat changes
  // Priority: 1) chat's personaId, 2) localStorage, 3) auto-select if only one persona
  useEffect(() => {
    if (!chat?.id || personas.length === 0) {
      setSelectedPersona(null);
      return;
    }

    // 1. Try chat's stored personaId first
    if (chat.personaId) {
      const persona = personas.find((p) => p.id === chat.personaId);
      if (persona) {
        setSelectedPersona(persona as PersonaDocument);
        return;
      }
    }

    // 2. Try localStorage for previously used persona
    const storageKey = `chat-persona-${chat.id}`;
    const savedPersonaId = localStorage.getItem(storageKey);
    if (savedPersonaId) {
      const persona = personas.find((p) => p.id === savedPersonaId);
      if (persona) {
        setSelectedPersona(persona as PersonaDocument);
        return;
      }
    }

    // 3. Auto-select if only one persona exists
    if (personas.length === 1) {
      setSelectedPersona(personas[0] as PersonaDocument);
      localStorage.setItem(storageKey, personas[0]!.id);
      return;
    }

    // No persona selected
    setSelectedPersona(null);
  }, [chat?.id, chat?.personaId, personas]);

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

  // Track if we should auto-scroll (only for new messages, not when loading older ones)
  const shouldAutoScrollRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom only for new messages
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (scrollElement && shouldAutoScrollRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      });
    }
    // Reset auto-scroll flag after handling
    shouldAutoScrollRef.current = true;
    prevMessageCountRef.current = allMessages.length;
  }, [allMessages]);

  // Handle scroll event for infinite scroll (load older messages)
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    // When user scrolls near the top (within 100px), load more messages
    if (target.scrollTop < 100 && hasMore && !isLoadingMore) {
      // Disable auto-scroll when loading older messages
      shouldAutoScrollRef.current = false;

      // Store current scroll height to preserve position after loading
      const previousScrollHeight = target.scrollHeight;

      loadMore().then(() => {
        // Preserve scroll position after loading older messages
        requestAnimationFrame(() => {
          const newScrollHeight = target.scrollHeight;
          target.scrollTop = newScrollHeight - previousScrollHeight;
        });
      }).catch(console.error);
    }
  }, [hasMore, isLoadingMore, loadMore]);

  // Attach scroll listener
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]");
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
      return () => scrollElement.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Persona selection handler - saves to localStorage
  const handlePersonaSelect = useCallback((persona: PersonaDocument | null) => {
    setSelectedPersona(persona);
    if (chat?.id && persona) {
      localStorage.setItem(`chat-persona-${chat.id}`, persona.id);
    }
  }, [chat?.id]);

  const handleSubmit = useCallback(async (userMessage: string) => {
    if (!isApiReady || isLoading) return;

    if (!selectedPersona) {
      toast.error(t("selectPersonaToSend"), {
        action: {
          label: t("createPersonaAction"),
          onClick: () => openPersonaEditor({ onSave: handlePersonaSelect }),
        },
      });
      return;
    }

    if (!character) return;

    setIsLoading(true);
    // Hide model overlay when user sends first message
    setShowModelOverlay(false);

    try {
      // Save user message first (inside try/catch to handle errors)
      await addMessage("user", userMessage);

      // Format memories for context (LRU ordered)
      const memoryContent = memories.length > 0
        ? formatMemoriesForPrompt(memories)
        : undefined;

      const context = createSingleChatContext({
        character,
        persona: selectedPersona,
        messages: storedMessages,
        theme: chatBubbleTheme,
        memoryContent,
        enableLorebook: false, // TODO: Enable when lorebook UI is ready
      });

      // Check if messenger mode is active
      const isMessengerMode = chatBubbleTheme === "messenger";

      // Get generation settings from chat scenario (with fallbacks to legacy settings)
      const genModel = chatGenSettings?.model ?? settings.defaultModel;
      const genTemperature = chatGenSettings?.temperature ?? settings.temperature;
      const genMaxTokens = chatGenSettings?.maxTokens ?? settings.maxTokens;
      const genThinking = chatGenSettings?.thinking ?? false;

      if (isMessengerMode) {
        // Messenger mode: Generate structured JSON response
        const messengerResponse = await generateMessengerChatResponse({
          context,
          userMessage,
          providerId: chatProviderId,
          providerSettings: chatProviderSettings!,
          model: genModel,
          temperature: genTemperature,
          maxTokens: genMaxTokens,
          thinking: genThinking,
        });

        // Save each message to database (ignoring delays)
        // Attach reasoning to the first message only, tokenUsage to the last message only
        for (let i = 0; i < messengerResponse.messages.length; i++) {
          const msg = messengerResponse.messages[i]!;
          const isFirst = i === 0;
          const isLast = i === messengerResponse.messages.length - 1;
          const reasoning = isFirst ? messengerResponse.reasoning : undefined;
          const tokenUsage = isLast ? messengerResponse.usage : undefined;
          await addMessage("assistant", msg.content, { reasoning, tokenUsage });
        }

        // Save memory if provided
        if (messengerResponse.memory) {
          await lruMemory.addContent(messengerResponse.memory, "system");
          console.log("[Messenger] Memory saved:", messengerResponse.memory);
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
          providerId: chatProviderId,
          providerSettings: chatProviderSettings!,
          model: genModel,
          temperature: genTemperature,
          maxTokens: genMaxTokens,
          thinking: genThinking,
        });
        console.log("[Roleplay] Stream generator created, starting iteration...");

        // Throttle UI updates: only update when content actually changes
        let lastUpdateTime = 0;
        let chunkCount = 0;
        const UPDATE_INTERVAL = 50; // ms - update UI at most every 50ms

        // Use manual iteration to capture the generator's return value (contains reasoning)
        let iterResult = await stream.next();
        while (!iterResult.done) {
          const chunk = iterResult.value;
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
          iterResult = await stream.next();
        }

        // Capture reasoning from the generator's return value
        const generatorResult = iterResult.value;
        const reasoning = generatorResult?.reasoning;

        console.log(`[Roleplay] Stream complete. Total chunks: ${chunkCount}, hasReasoning: ${!!reasoning}`);

        // Final update to ensure all content is displayed
        setStreamingContent(streamingContentRef.current);

        // Save assistant message and clear streaming state
        const fullContent = streamingContentRef.current;
        streamingContentRef.current = "";
        setStreamingContent("");

        console.log("[Roleplay] Saving assistant message...");
        if (fullContent) {
          await addMessage("assistant", fullContent, { reasoning, tokenUsage: generatorResult?.usage });
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
  }, [isApiReady, isLoading, selectedPersona, character, t, addMessage, memories, storedMessages, chatBubbleTheme, chatProviderId, chatProviderSettings, settings, chatGenSettings, openPersonaEditor, lruMemory]);

  // Stable callback refs to prevent MessageBubble re-renders
  const handleDeleteRef = useRef(deleteMessage);
  handleDeleteRef.current = deleteMessage;

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    // Don't delete streaming messages
    if (messageId.startsWith("streaming")) {
      return;
    }
    await handleDeleteRef.current(messageId);
  }, []);

  // Stable edit handler using dialog context
  const handleEditMessage = useCallback((messageId: string, content: string) => {
    openEditDialog(messageId, content);
  }, [openEditDialog]);

  // Translation handler
  const handleTranslate = useCallback(async (messageId: string, content: string) => {
    // Get translation-specific settings
    const translationSettings = getSettings("text_translation");
    const providerId = (translationSettings?.providerId ?? "gemini") as "gemini" | "openrouter" | "anthropic" | "grok" | "openai" | "nanogpt";
    const providerSettings = providers.get(providerId);

    if (!providerSettings?.apiKey) {
      toast.error(t("translationNotConfigured"));
      return;
    }

    // Get target language from translation settings, fallback to browser locale
    const targetLanguage = (translationSettings?.metadata?.targetLanguage as string)
      ?? navigator.language.split("-")[0]
      ?? "en";

    setIsTranslating(prev => ({ ...prev, [messageId]: true }));

    try {
      const translatedText = await translateText({
        text: content,
        targetLanguage,
        providerId: providerId as any,
        providerSettings,
      });

      await setTranslation(messageId, translatedText, targetLanguage);
      toast.success(t("translated"));
    } catch (error) {
      console.error("Translation error:", error);
      toast.error(t("translationError"));
    } finally {
      setIsTranslating(prev => ({ ...prev, [messageId]: false }));
    }
  }, [getSettings, providers, t, setTranslation]);

  // Image generation handler
  const handleGenerateImage = useCallback(async (messageId: string, content: string) => {
    if (!character) return;

    // Get text generation settings for prompt generation (use aibot scenario)
    const aibotSettings = getSettings("text_aibot");
    const textProviderId = (aibotSettings?.providerId ?? chatProviderId) as "gemini" | "openrouter" | "anthropic" | "grok" | "openai" | "nanogpt";
    const textProviderSettings = providers.get(textProviderId);

    // Get image generation settings
    const imageSettings = getSettings("image");
    const imageProviderId = (imageSettings?.providerId ?? "falai") as ImageProvider;
    const imageProviderSettings = providers.get(imageProviderId);

    // Check if text provider is configured (for prompt generation)
    if (!textProviderSettings?.apiKey) {
      toast.error(t("imageGenerationNotConfigured"));
      return;
    }

    // Check if image provider is configured
    if (!imageProviderSettings?.apiKey) {
      toast.error(t("imageGenerationNotConfigured"));
      return;
    }

    setIsGeneratingImage(prev => ({ ...prev, [messageId]: true }));

    try {
      console.log("[ImageGen] Starting image generation for message:", messageId);

      // Step 1: Generate image prompt from message content
      console.log("[ImageGen] Generating image prompt...");
      const imagePrompt = await generateImagePrompt({
        messageContent: content,
        characterDescription: character.description,
        characterScenario: character.scenario,
        characterName: character.name,
        providerId: textProviderId,
        providerSettings: textProviderSettings,
        model: aibotSettings?.model,
      });
      console.log("[ImageGen] Generated prompt:", imagePrompt);

      // Step 2: Generate the image
      console.log("[ImageGen] Generating image with fal.ai...");
      const imageResult = await generateImage({
        prompt: imagePrompt,
        providerId: imageProviderId,
        providerSettings: imageProviderSettings,
        model: imageSettings?.model ?? "fal-ai/z-image/turbo",
        aspectRatio: (imageSettings?.metadata?.aspectRatio as any) ?? "1:1",
        resolution: (imageSettings?.metadata?.resolution as any) ?? "1K",
      });

      if (!imageResult.images || imageResult.images.length === 0) {
        throw new Error("No images generated");
      }

      const generatedImage = imageResult.images[0]!;
      console.log("[ImageGen] Image generated:", generatedImage.url);

      // Step 3: Download the image and convert to Uint8Array
      console.log("[ImageGen] Downloading image...");
      const response = await fetch(generatedImage.url);
      if (!response.ok) {
        throw new Error("Failed to download generated image");
      }
      const imageBuffer = await response.arrayBuffer();
      const imageData = new Uint8Array(imageBuffer);

      // Step 4: Add as attachment to the message
      console.log("[ImageGen] Adding attachment to message...");
      await addAttachment(messageId, {
        type: "image",
        mimeType: generatedImage.contentType,
        data: imageData,
        prompt: imagePrompt,
        width: generatedImage.width,
        height: generatedImage.height,
      });

      toast.success(t("imageGenerated"));
      console.log("[ImageGen] Complete!");
    } catch (error) {
      console.error("[ImageGen] Error:", error);
      toast.error(t("imageGenerationError"));
    } finally {
      setIsGeneratingImage(prev => ({ ...prev, [messageId]: false }));
    }
  }, [character, getSettings, chatProviderId, providers, t, addAttachment]);

  // Voice generation handler
  const handleGenerateVoice = useCallback(async (messageId: string, content: string) => {
    // Get voice generation settings
    const voiceSettings = getSettings("voice");
    const voiceProviderId = (voiceSettings?.providerId ?? "gemini") as VoiceProvider;
    const voiceProviderSettings = providers.get(voiceProviderId);

    // Check if voice provider is configured
    if (!voiceProviderSettings?.apiKey) {
      toast.error(t("voiceGenerationNotConfigured"));
      return;
    }

    // Check if voice provider is supported
    if (voiceProviderId !== "gemini" && voiceProviderId !== "elevenlabs") {
      toast.error("Voice generation requires Gemini or ElevenLabs provider");
      return;
    }

    setIsGeneratingVoice(prev => ({ ...prev, [messageId]: true }));

    try {
      console.log("[VoiceGen] Starting voice generation for message:", messageId);

      // Generate speech from message content
      // Model defaults are handled by provider-specific functions in client.ts
      const speechResult = await generateSpeech({
        text: content,
        providerId: voiceProviderId,
        providerSettings: voiceProviderSettings,
        model: voiceSettings?.model,
        voiceName: voiceSettings?.voiceName,
        language: voiceSettings?.voiceLanguage,
      });

      console.log("[VoiceGen] Speech generated, adding attachment...");

      // Convert base64 to Uint8Array
      const binaryString = atob(speechResult.audioData);
      const audioData = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        audioData[i] = binaryString.charCodeAt(i);
      }

      // Add as attachment to the message
      await addAttachment(messageId, {
        type: "audio",
        mimeType: speechResult.mimeType,
        data: audioData,
      });

      toast.success(t("voiceGenerated"));
      console.log("[VoiceGen] Complete!");
    } catch (error) {
      console.error("[VoiceGen] Error:", error);
      toast.error(t("voiceGenerationError"));
    } finally {
      setIsGeneratingVoice(prev => ({ ...prev, [messageId]: false }));
    }
  }, [getSettings, providers, t, addAttachment]);

  // useChats for creating new chats
  const { chats, createChat } = useChats(character?.id);

  // Handle starting a new chat with selected character
  const handleStartChat = useCallback(async () => {
    if (!character) return;
    const newChat = await createChat(character.id);
    if (newChat && onSelectChat) {
      onSelectChat(newChat);
    }
  }, [character, createChat, onSelectChat]);

  // No character selected
  if (!character) {
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

  // Character selected but no chat
  if (!chat) {
    // Get the 3 most recent chats for this character
    const recentChats = chats.slice(0, 3);

    return (
      <div className={cn("flex h-full flex-col", className)}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 max-w-md mx-auto">
          <ExperimentalDisclaimer type="chat" />
          <Button
            size="lg"
            className="gap-3 h-14 px-6"
            onClick={handleStartChat}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={character.avatarData} />
              <AvatarFallback className="text-xs text-black dark:text-white">{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span>{t("chatWith", { name: character.name })}</span>
          </Button>

          {/* Recent chats list */}
          {recentChats.length > 0 && (
            <div className="w-full space-y-2">
              <p className="text-xs text-muted-foreground text-center">{t("recentChats")}</p>
              <div className="space-y-1">
                {recentChats.map((recentChat) => (
                  <button
                    key={recentChat.id}
                    onClick={() => onSelectChat?.(recentChat)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-left group"
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={character.avatarData} />
                      <AvatarFallback className="text-xs text-black dark:text-white">{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{recentChat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(recentChat.lastMessageAt ?? recentChat.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
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
      {/* Header - hidden on mobile since ChatMobileHeader handles it */}
      <div className="hidden md:flex shrink-0 items-center justify-between px-4 py-3">
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
          <Button variant="ghost" size="icon" onClick={openMemoryDialog} title="Chat Memory">
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
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {/* Loading indicator for older messages */}
            {isLoadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* "Load more" hint when there are older messages */}
            {hasMore && !isLoadingMore && (
              <div className="flex justify-center py-2">
                <span className="text-xs text-muted-foreground">{t("scrollForMore")}</span>
              </div>
            )}

            {allMessages
              .filter((m) => m.role !== "system")
              .map((message, index, filteredMessages) => {
                // Check if this is the last message in a group from the same sender
                const prevMessage = filteredMessages[index - 1];
                const nextMessage = filteredMessages[index + 1];
                const isFirstInGroup = !prevMessage || prevMessage.role !== message.role;
                const isLastInGroup = !nextMessage || nextMessage.role !== message.role;

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    character={character}
                    chatBubbleTheme={chatBubbleTheme}
                    assetContext={assetContext}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onTranslate={handleTranslate}
                    onGenerateImage={handleGenerateImage}
                    onGenerateVoice={handleGenerateVoice}
                    isTranslating={isTranslating[message.id] ?? false}
                    isGeneratingImage={isGeneratingImage[message.id] ?? false}
                    isGeneratingVoice={isGeneratingVoice[message.id] ?? false}
                    getAttachmentDataUrl={getAttachmentDataUrl}
                    getAttachmentBlob={getAttachmentBlob}
                  />
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

        {/* Model Info Overlay - shows until user sends first message */}
        {showModelOverlay && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-4">
            <div className="bg-background/80 backdrop-blur-sm border rounded-lg shadow-sm overflow-hidden">
              {/* Collapsed View */}
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    {chatBubbleTheme === "messenger" ? (
                      <MessageSquare className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span className="capitalize">{chatBubbleTheme}</span>
                  </div>
                  <span className="text-muted-foreground/50">•</span>
                  <div className="flex items-center gap-1.5">
                    <span>{PROVIDER_CONFIGS[chatProviderId]?.name ?? chatProviderId}</span>
                    {chatGenSettings?.model && (
                      <>
                        <span className="text-muted-foreground/50">/</span>
                        <span className="font-mono text-xs">{chatGenSettings.model}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setOverlayExpanded(!overlayExpanded)}
                  className="ml-1 p-1 rounded hover:bg-muted/50 transition-colors"
                >
                  {overlayExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Expanded View - All Scenarios */}
              {overlayExpanded && (
                <div className="border-t px-3 py-2 space-y-1.5">
                  {/* Text Chat */}
                  {(() => {
                    const s = allGenSettings.get("text_chat");
                    const hasApiKey = s?.providerId ? isProviderReady(s.providerId as any) : false;
                    const isReady = s?.enabled !== false && hasApiKey;
                    return (
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          <span>Chat</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isReady ? (
                            <>
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-muted-foreground font-mono">
                                {PROVIDER_CONFIGS[s?.providerId as keyof typeof PROVIDER_CONFIGS]?.name ?? s?.providerId}
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 text-muted-foreground/50" />
                              <span className="text-muted-foreground/50">{s?.enabled === false ? "Disabled" : "No API Key"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Text Translation */}
                  {(() => {
                    const s = allGenSettings.get("text_translation");
                    const hasApiKey = s?.providerId ? isProviderReady(s.providerId as any) : false;
                    const isReady = s?.enabled !== false && hasApiKey;
                    return (
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Languages className="h-3 w-3" />
                          <span>Translation</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isReady ? (
                            <>
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-muted-foreground font-mono">
                                {PROVIDER_CONFIGS[s?.providerId as keyof typeof PROVIDER_CONFIGS]?.name ?? s?.providerId}
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 text-muted-foreground/50" />
                              <span className="text-muted-foreground/50">{s?.enabled === false ? "Disabled" : "No API Key"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Text AI Bot */}
                  {(() => {
                    const s = allGenSettings.get("text_aibot");
                    const hasApiKey = s?.providerId ? isProviderReady(s.providerId as any) : false;
                    const isReady = s?.enabled !== false && hasApiKey;
                    return (
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Bot className="h-3 w-3" />
                          <span>AI Bot</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isReady ? (
                            <>
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-muted-foreground font-mono">
                                {PROVIDER_CONFIGS[s?.providerId as keyof typeof PROVIDER_CONFIGS]?.name ?? s?.providerId}
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 text-muted-foreground/50" />
                              <span className="text-muted-foreground/50">{s?.enabled === false ? "Disabled" : "No API Key"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Image Generation */}
                  {(() => {
                    const s = allGenSettings.get("image");
                    const hasApiKey = s?.providerId ? isProviderReady(s.providerId as any) : false;
                    const isReady = s?.enabled !== false && hasApiKey;
                    return (
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Image className="h-3 w-3" />
                          <span>Image</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isReady ? (
                            <>
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-muted-foreground font-mono">
                                {PROVIDER_CONFIGS[s?.providerId as keyof typeof PROVIDER_CONFIGS]?.name ?? s?.providerId}
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 text-muted-foreground/50" />
                              <span className="text-muted-foreground/50">{s?.enabled === false ? "Disabled" : "No API Key"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Voice Generation */}
                  {(() => {
                    const s = allGenSettings.get("voice");
                    const hasApiKey = s?.providerId ? isProviderReady(s.providerId as any) : false;
                    const isReady = s?.enabled !== false && hasApiKey;
                    return (
                      <div className="flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Volume2 className="h-3 w-3" />
                          <span>Voice</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isReady ? (
                            <>
                              <Check className="h-3 w-3 text-green-500" />
                              <span className="text-muted-foreground font-mono">
                                {PROVIDER_CONFIGS[s?.providerId as keyof typeof PROVIDER_CONFIGS]?.name ?? s?.providerId}
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 text-muted-foreground/50" />
                              <span className="text-muted-foreground/50">{s?.enabled === false ? "Disabled" : "No API Key"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input - Fixed at Bottom */}
      <ChatInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        placeholder={t("messagePlaceholder", { name: character.name })}
        personas={personas}
        selectedPersona={selectedPersona}
        onPersonaSelect={handlePersonaSelect}
        onCreatePersona={() => openPersonaEditor({ onSave: handlePersonaSelect })}
        translations={{
          selectPersona: t("selectPersona"),
          noPersonas: t("noPersonas"),
          createPersona: t("createPersona"),
        }}
      />

    </div>
  );
}

// Exported component wrapped with ChatDialogsProvider
export function CenterPanel(props: CenterPanelProps) {
  const { character, chat } = props;
  const { messages: storedMessages, updateMessage } = useMessages(chat?.id ?? "");
  const { memories, isLoading: memoriesLoading } = useMemories(chat?.id ?? "", 50);
  const lruMemory = useLRUMemory(chat?.id ?? "", character?.id ?? "");
  const { deleteMemory } = useDeleteMemory();
  const { db } = useDatabase();

  // Memory creation handler for MemoryDialog
  const createMemory = useCallback(async (data: { chatId: string; characterId: string; content: string }) => {
    return await lruMemory.addContent(data.content, "manual");
  }, [lruMemory]);

  // Edit save handler for EditMessageDialog
  const handleSaveEditedMessage = useCallback(async (messageId: string, newContent: string) => {
    await updateMessage(messageId, newContent);
  }, [updateMessage]);

  return (
    <ChatDialogsProvider
      character={character}
      chat={chat}
      memories={memories}
      memoriesLoading={memoriesLoading}
      db={db}
      onSaveEditedMessage={handleSaveEditedMessage}
      onCreateMemory={createMemory}
      onDeleteMemory={deleteMemory}
    >
      <CenterPanelInner {...props} />
    </ChatDialogsProvider>
  );
}
