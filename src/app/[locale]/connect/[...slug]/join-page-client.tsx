"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Wifi, WifiOff, AlertCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "~/components/layout";
import { WebRTCProvider, useWebRTCPeer } from "~/app/_components/p2p/webrtc-provider";
import {
  CharacterSelector,
  SessionLobby,
  ChatRoom,
  useConnectSession,
  useConnectPeers,
  useAutoReply,
} from "~/app/_components/connect";
import { useSettings } from "~/lib/db/hooks";
import { SettingsModal } from "~/components/settings-modal";
import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/routing";
import type { CharacterData } from "~/lib/connect/messages";
import { cn } from "~/lib/utils";

type JoinState =
  | "selecting" // Choosing character
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
}

function JoinPageContent({
  slug,
  hostPeerId,
  initialParticipants,
  isFull,
}: JoinPageContentProps) {
  const t = useTranslations("connect");
  const { peer, peerId, isConnecting: peerConnecting, error: peerError } = useWebRTCPeer();
  const { settings, isApiReady, effectiveApiKey, isClientMode } = useSettings();

  const [state, setState] = useState<JoinState>(isFull ? "full" : "selecting");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      setState("lobby");
    },
    onError: (error) => {
      toast.error(error);
      setState("error");
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
    apiKey: effectiveApiKey ?? null,
    isApiReady,
    isClientMode,
    model: settings?.defaultModel,
    temperature: settings?.temperature,
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
        handleAutoReply(
          lastMessage,
          chatMessages,
          participants.filter((p) => p.character !== null).map((p) => p.character!)
        );
      }
    }
  }, [chatHistory, peerId, participants, handleAutoReply]);

  // Track previous autoReplyEnabled to detect toggle from off to on
  const prevAutoReplyRef = useRef(autoReplyEnabled);
  useEffect(() => {
    // If toggled from off to on, trigger generation
    if (autoReplyEnabled && !prevAutoReplyRef.current) {
      // Filter to only chat messages for AI generation
      const chatMessages = chatHistory.filter((m): m is Extract<typeof m, { type: "ChatMessage" }> => m.type === "ChatMessage");
      triggerGeneration(
        chatMessages,
        participants.filter((p) => p.character !== null).map((p) => p.character!)
      );
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

  // Handle character selection
  const handleCharacterSelect = useCallback(
    async (character: CharacterData) => {
      setSelectedCharacter(character);
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
    [peerId, joinSession, t]
  );

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

  // Connection status indicator
  const ConnectionStatus = () => (
    <div
      className={cn(
        "fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full text-sm",
        peerConnecting
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          : peerError
          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      )}
    >
      {peerConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("status.connecting")}
        </>
      ) : peerError ? (
        <>
          <WifiOff className="h-4 w-4" />
          {t("status.disconnected")}
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          {t("status.connected")}
        </>
      )}
    </div>
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
          <Link href="/connect">{t("errors.createOwn")}</Link>
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
            <Link href="/connect">{t("errors.createOwn")}</Link>
          </Button>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold">{t("join.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("join.subtitle")}</p>
            </div>
          </div>
          <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
        {initialParticipants.length > 0 && state === "selecting" && (
          <p className="text-sm text-muted-foreground mt-2">
            {t("join.currentParticipants", { count: initialParticipants.length })}
          </p>
        )}
      </div>

      {/* Main Content */}
      {state === "selecting" && (
        <CharacterSelector
          onSelect={handleCharacterSelect}
          isLoading={peerConnecting}
          onOpenSettings={() => setSettingsOpen(true)}
        />
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

      <ConnectionStatus />
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
