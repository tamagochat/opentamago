"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "~/components/layout";
import { WebRTCProvider, useWebRTCPeer } from "~/app/_components/p2p/webrtc-provider";
import {
  CharacterSelector,
  SessionLobby,
  ChatRoom,
  ConnectionStatus,
  useConnectSession,
  useConnectPeers,
  useConnectPeersPersistent,
  useConnectNavigation,
  useAutoReply,
} from "~/app/_components/connect";
import { useSettings } from "~/lib/db/hooks";
import { SettingsModal } from "~/components/settings-modal";
import type { CharacterData } from "~/lib/connect/messages";
import { ExperimentalDisclaimer } from "~/components/experimental-disclaimer";
import { ConnectRejoinBanner } from "~/components/connect-rejoin-banner";

type ConnectState =
  | "selecting" // Choosing character
  | "creating" // Creating session
  | "lobby" // In waiting room
  | "chatting"; // Active chat

function ConnectPageContent() {
  const t = useTranslations("connect");
  const { peer, peerId, isConnecting: peerConnecting, error: peerError } = useWebRTCPeer();
  const { settings, isApiReady, effectiveApiKey, isClientMode } = useSettings();

  const [state, setState] = useState<ConnectState>("selecting");
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Session management
  const {
    sessionId,
    shortSlug,
    longSlug,
    isReady: sessionReady,
    createSession,
    leaveSession,
    isCreating,
  } = useConnectSession({
    peerId,
    character: selectedCharacter,
    isHost: true,
    onSessionCreated: () => {
      setState("lobby");
    },
    onError: (error) => {
      toast.error(error);
      setState("selecting");
    },
  });

  // Peer connections with persistence
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
  } = useConnectPeersPersistent({
    isHost: true,
    hostPeerId: peerId,
    myCharacter: selectedCharacter,
    sessionId: sessionId?.toString(),
    slug: shortSlug ?? undefined,
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
    },
  });

  // Memoize onResponse to prevent infinite loops
  const handleAutoReplyResponse = useCallback(
    (content: string) => {
      sendChatMessage(content, false);
    },
    [sendChatMessage]
  );

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
    onResponse: handleAutoReplyResponse,
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
        handleAutoReply(lastMessage, chatMessages, participantNames);
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

  // Handle navigation (show toast when navigating away, persist state)
  useConnectNavigation({
    isInChat: state === "chatting",
    participantCount: participants.filter((p) => p.status === "ready").length,
  });

  // Handle character selection
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
      setState("creating");

      // Wait for peer connection
      if (!peerId) {
        toast.error(t("errors.noPeer"));
        setState("selecting");
        return;
      }

      // Pass character directly to avoid React state timing issues
      await createSession(character);
    },
    [peerId, createSession, t, isApiReady]
  );

  // Handle start chat
  const handleStartChat = useCallback(() => {
    setState("chatting");
  }, []);

  // Handle back to lobby (host only)
  const handleBackToLobby = useCallback(() => {
    setState("lobby");
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

  return (
    <>
      {/* Rejoin Banner */}
      <ConnectRejoinBanner />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
          <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </div>

      <ExperimentalDisclaimer type="p2p" />

      {/* Main Content */}
      {state === "selecting" && (
        <CharacterSelector
          onSelect={handleCharacterSelect}
          isLoading={peerConnecting}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {state === "creating" && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t("creating")}</p>
        </div>
      )}

      {state === "lobby" && shortSlug && selectedCharacter && (
        <SessionLobby
          shortSlug={shortSlug}
          longSlug={longSlug}
          myCharacter={selectedCharacter}
          participants={participants}
          isHost={true}
          isConnecting={false}
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
          isHost={true}
          onSendMessage={handleSendMessage}
          onToggleAutoReply={toggleAutoReply}
          onBackToLobby={handleBackToLobby}
          onLeave={handleLeave}
        />
      )}

      <ConnectionStatus isConnecting={peerConnecting} error={peerError} />
    </>
  );
}

export function ConnectPageClient() {
  return (
    <MainLayout showFooter={false}>
      <div className="container max-w-4xl py-8">
        <WebRTCProvider>
          <ConnectPageContent />
        </WebRTCProvider>
      </div>
    </MainLayout>
  );
}
