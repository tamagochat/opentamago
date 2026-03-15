"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, AlertCircle, Users, Lock } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "~/components/layout";
import { WebRTCProvider, useWebRTCPeer } from "~/app/_components/p2p/webrtc-provider";
import { PasswordInput, type PasswordInputRef } from "~/app/_components/p2p/password-input";
import {
  CharacterSelector,
  SessionLobby,
  ChatRoom,
  ConnectionStatus,
  useConnectSession,
  useConnectPeers,
  useAutoReply,
} from "~/app/_components/connect";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useSettings, useProviderSettings, useGenerationSettings } from "~/lib/db/hooks";
import type { LLMProvider } from "~/lib/ai";
import { SettingsModal } from "~/components/settings-modal";
import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/routing";
import type { CharacterData } from "~/lib/connect/messages";
import { ExperimentalDisclaimer } from "~/components/experimental-disclaimer";

type JoinState =
  | "selecting" // Choosing character
  | "confirm" // Confirming character (with optional password entry)
  | "joining" // Joining session
  | "lobby" // In waiting room
  | "chatting" // Active chat
  | "full" // Session is full
  | "error"; // Error state

interface JoinPageContentProps {
  slug: string;
  hostPeerId: string;
  initialParticipants: Array<{
    peerId: string;
    characterName: string;
    characterAvatar: string | null;
    isHost: boolean | null;
  }>;
  isFull: boolean;
  hasPassword: boolean;
}

function JoinPageContent({
  slug,
  hostPeerId,
  initialParticipants,
  isFull,
  hasPassword,
}: JoinPageContentProps) {
  const t = useTranslations("connect");
  const tP2p = useTranslations("p2p");
  const { peer, peerId, isConnecting: peerConnecting, error: peerError } = useWebRTCPeer();
  const { settings } = useSettings();
  const { providers, isProviderReady } = useProviderSettings();
  const { getChatSettings } = useGenerationSettings();

  // Get provider settings for chat
  const chatGenSettings = getChatSettings();
  const chatProviderId = (chatGenSettings?.providerId ?? "gemini") as LLMProvider;
  const chatProviderSettings = providers.get(chatProviderId);
  const isApiReady = isProviderReady(chatProviderId);

  const [state, setState] = useState<JoinState>(isFull ? "full" : "selecting");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const passwordInputRef = useRef<PasswordInputRef>(null);

  // Session management
  const {
    sessionId,
    isReady: sessionReady,
    joinSession,
    leaveSession,
    isJoining,
  } = useConnectSession({
    peerId,
    character: selectedCharacter,
    isHost: false,
    slug,
    onSessionJoined: () => {
      setSessionError(null);
      setState("lobby");
    },
    onError: (error) => {
      toast.error(error);
      setSessionError(error);
      // Stay in confirm state to allow retrying
      setState("confirm");
    },
  });

  // Peer connections
  const {
    participants,
    isConnected,
    autoReplyEnabled,
    chatHistory,
    thinkingPeers,
    sendChatMessage,
    sendThinking,
    toggleAutoReply,
    disconnectAll,
  } = useConnectPeers({
    isHost: false,
    hostPeerId,
    myCharacter: selectedCharacter,
    sessionId: sessionId?.toString(),
    onParticipantJoined: (participant) => {
      if (participant.character) {
        toast.success(t("notifications.joined", { name: participant.character.name }));
      }
    },
    onParticipantLeft: (leftPeerId) => {
      const participant = participants.find((p) => p.peerId === leftPeerId);
      if (participant?.character) {
        toast.info(t("notifications.left", { name: participant.character.name }));
      }
      // If host left, show error
      if (leftPeerId === hostPeerId) {
        toast.error(t("errors.hostLeft"));
        setState("error");
      }
    },
  });

  // Auto-reply
  const {
    isGenerating,
    handleMessage: handleAutoReply,
    handleThinkingEvent,
    triggerGeneration,
  } = useAutoReply({
    myPeerId: peerId,
    myCharacter: selectedCharacter,
    enabled: autoReplyEnabled,
    providerId: chatProviderId,
    providerSettings: chatProviderSettings,
    isApiReady,
    model: chatGenSettings?.model ?? settings?.defaultModel,
    temperature: chatGenSettings?.temperature ?? settings?.temperature,
    onResponse: (content) => {
      sendChatMessage(content, false);
    },
  });

  // Handle incoming messages for auto-reply
  useEffect(() => {
    if (chatHistory.length > 0) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      // Only process chat messages, not system messages
      if (lastMessage && lastMessage.type === "ChatMessage" && lastMessage.senderId !== peerId) {
        // Filter to only chat messages for auto-reply
        const chatMessages = chatHistory.filter((m): m is typeof lastMessage => m.type === "ChatMessage");
        // Extract character names only (privacy - we don't share full character details)
        const participantNames = participants
          .filter((p) => p.character !== null)
          .map((p) => p.character!.name);

        console.log("[AutoReply] Guest processing message:", {
          lastMessageFrom: lastMessage.senderId.slice(0, 8),
          myPeerId: peerId?.slice(0, 8),
          participantCount: participants.length,
          participantNamesCount: participantNames.length,
          participantNames,
          autoReplyEnabled,
        });

        handleAutoReply(lastMessage, chatMessages, participantNames);
      }
    }
  }, [chatHistory, peerId, participants, handleAutoReply, autoReplyEnabled]);

  // Track previous autoReplyEnabled to detect toggle from off to on
  const prevAutoReplyRef = useRef(autoReplyEnabled);
  useEffect(() => {
    // If toggled from off to on, trigger generation
    if (autoReplyEnabled && !prevAutoReplyRef.current) {
      // Filter to only chat messages for AI generation
      const chatMessages = chatHistory.filter((m): m is Extract<typeof m, { type: "ChatMessage" }> => m.type === "ChatMessage");
      // Extract character names only (privacy - we don't share full character details)
      const participantNames = participants
        .filter((p) => p.character !== null)
        .map((p) => p.character!.name);
      triggerGeneration(chatMessages, participantNames);
    }
    prevAutoReplyRef.current = autoReplyEnabled;
  }, [autoReplyEnabled, chatHistory, participants, triggerGeneration]);

  // Broadcast thinking status when generating
  useEffect(() => {
    sendThinking(isGenerating);
  }, [isGenerating, sendThinking]);

  // Handle thinking events from other participants (debounce logic)
  const prevThinkingPeersRef = useRef<string[]>([]);
  useEffect(() => {
    // Find newly added thinking peers
    const newThinking = thinkingPeers.filter(
      (p) => !prevThinkingPeersRef.current.includes(p)
    );

    // Notify auto-reply hook about new thinking events
    newThinking.forEach((peerId) => {
      handleThinkingEvent(peerId, true, Date.now());
    });

    prevThinkingPeersRef.current = thinkingPeers;
  }, [thinkingPeers, handleThinkingEvent]);

  // Handle character selection - go to confirm step if password required
  const handleCharacterSelect = useCallback(
    async (character: CharacterData) => {
      // Check if API is ready before joining
      if (!isApiReady) {
        toast.error(t("errors.apiNotReady"), {
          description: t("errors.apiNotReadyDescription"),
          action: {
            label: t("errors.openSettings"),
            onClick: () => setSettingsOpen(true),
          },
        });
        return;
      }

      setSelectedCharacter(character);

      // If session has password, go to confirm step first
      if (hasPassword) {
        setState("confirm");
        return;
      }

      // No password, join directly
      setState("joining");

      // Wait for peer connection
      if (!peerId) {
        toast.error(t("errors.noPeer"));
        setState("selecting");
        return;
      }

      // Pass character directly to avoid React state timing issues
      await joinSession(character);
    },
    [peerId, joinSession, t, isApiReady, hasPassword]
  );

  // Handle cancel from confirm step
  const handleCancelConfirm = useCallback(() => {
    setSelectedCharacter(null);
    setPasswordError(null);
    setSessionError(null);
    passwordInputRef.current?.reset();
    setState("selecting");
  }, []);

  // Handle join from confirm step (with password)
  const handleJoinWithPassword = useCallback(async () => {
    if (!selectedCharacter) return;

    // Wait for peer connection
    if (!peerId) {
      toast.error(t("errors.noPeer"));
      return;
    }

    const password = passwordInputRef.current?.getValue() || "";
    if (hasPassword && !password) {
      setPasswordError(t("join.passwordRequired"));
      return;
    }

    setState("joining");
    setPasswordError(null);
    setSessionError(null);

    try {
      await joinSession(selectedCharacter, password);
    } catch (error) {
      // Check if it's a password error
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("Invalid password") || message.includes("Password required")) {
        setPasswordError(t("join.passwordError"));
      } else {
        setSessionError(message);
      }
      // Stay in confirm state to allow retrying
      setState("confirm");
    }
  }, [peerId, selectedCharacter, joinSession, t, hasPassword]);

  // Handle start chat
  const handleStartChat = useCallback(() => {
    setState("chatting");
  }, []);

  // Handle leave
  const handleLeave = useCallback(() => {
    disconnectAll();
    leaveSession();
    setState("selecting");
    setSelectedCharacter(null);
  }, [disconnectAll, leaveSession]);

  // Handle send message
  const handleSendMessage = useCallback(
    (content: string, isHuman: boolean) => {
      sendChatMessage(content, isHuman);
    },
    [sendChatMessage]
  );

  // Full session state
  if (state === "full") {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground" />
        <h1 className="text-2xl font-bold mt-4">{t("errors.sessionFull")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("errors.sessionFullDescription")}
        </p>
        <Button asChild className="mt-6">
          <Link href="/p2p/connect">{t("errors.createOwn")}</Link>
        </Button>
      </div>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
        <h1 className="text-2xl font-bold mt-4">{t("errors.connectionFailed")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("errors.connectionFailedDescription")}
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <Button variant="outline" onClick={() => setState("selecting")}>
            {t("errors.tryAgain")}
          </Button>
          <Button asChild>
            <Link href="/p2p/connect">{t("errors.createOwn")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Determine if user has joined (lobby or chatting state)
  const hasJoined = state === "lobby" || state === "chatting";

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {hasJoined ? t("title") : t("join.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {hasJoined ? t("subtitle") : t("join.subtitle")}
              </p>
            </div>
          </div>
          <SettingsModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            hiddenTabs={["chatUI", "database"]}
          />
        </div>
        {initialParticipants.length > 0 && state === "selecting" && (
          <p className="text-sm text-muted-foreground mt-2">
            {t("join.currentParticipants", { count: initialParticipants.length })}
          </p>
        )}
      </div>

      {hasJoined && <ExperimentalDisclaimer type="p2p" />}

      {/* Main Content */}
      {state === "selecting" && (
        <CharacterSelector
          onSelect={handleCharacterSelect}
          isLoading={peerConnecting}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {state === "confirm" && selectedCharacter && (
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="rounded-lg border bg-muted/30 p-4">
            {hasPassword && (
              <div className="flex items-center gap-2 mb-4">
                <Lock className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{t("join.passwordProtected")}</p>
              </div>
            )}
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-background">
              <Avatar className="h-16 w-16">
                {selectedCharacter.avatar ? (
                  <AvatarImage src={selectedCharacter.avatar} alt={selectedCharacter.name} />
                ) : null}
                <AvatarFallback className="text-lg">
                  {selectedCharacter.name[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{selectedCharacter.name}</h3>
                {selectedCharacter.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {selectedCharacter.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {hasPassword && (
            <PasswordInput
              ref={passwordInputRef}
              label={t("join.enterPassword")}
              placeholder={tP2p("download.passwordPlaceholder")}
              hint={t("join.passwordHintJoin")}
            />
          )}

          {(passwordError || sessionError) && (
            <p className="text-sm text-destructive">{passwordError || sessionError}</p>
          )}

          {peerError && (
            <p className="text-sm text-destructive">{peerError}</p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancelConfirm} className="flex-1">
              {tP2p("cancel")}
            </Button>
            <Button
              onClick={handleJoinWithPassword}
              disabled={peerConnecting || isJoining || !peerId}
              className="flex-1"
            >
              {peerConnecting || isJoining ? t("joining") : t("join.joinButton")}
            </Button>
          </div>
        </div>
      )}

      {state === "joining" && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t("joining")}</p>
        </div>
      )}

      {state === "lobby" && selectedCharacter && (
        <SessionLobby
          shortSlug={slug}
          longSlug={null}
          myCharacter={selectedCharacter}
          participants={participants}
          isHost={false}
          isConnecting={!isConnected}
          onStartChat={handleStartChat}
          onLeave={handleLeave}
        />
      )}

      {state === "chatting" && selectedCharacter && peerId && (
        <ChatRoom
          myPeerId={peerId}
          myCharacter={selectedCharacter}
          participants={participants}
          messages={chatHistory}
          autoReplyEnabled={autoReplyEnabled}
          thinkingPeers={thinkingPeers}
          onSendMessage={handleSendMessage}
          onToggleAutoReply={toggleAutoReply}
          onLeave={handleLeave}
        />
      )}

      <ConnectionStatus isConnecting={peerConnecting} error={peerError} />
    </>
  );
}

export function JoinPageClient(props: JoinPageContentProps) {
  return (
    <MainLayout showFooter={false}>
      <div className="container max-w-4xl py-8">
        <WebRTCProvider>
          <JoinPageContent {...props} />
        </WebRTCProvider>
      </div>
    </MainLayout>
  );
}
