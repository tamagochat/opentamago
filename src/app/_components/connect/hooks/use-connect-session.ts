"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { api } from "~/trpc/react";
import { CONNECT_CONFIG } from "~/lib/connect";
import type { CharacterData } from "~/lib/connect/messages";

interface UseConnectSessionOptions {
  peerId: string | null;
  character: CharacterData | null;
  isHost: boolean;
  slug?: string; // For joining existing session
  onSessionCreated?: (session: {
    shortSlug: string;
    longSlug: string;
    sessionId: number;
  }) => void;
  onSessionJoined?: (hostPeerId: string) => void;
  onError?: (error: string) => void;
}

export function useConnectSession({
  peerId,
  character,
  isHost,
  slug,
  onSessionCreated,
  onSessionJoined,
  onError,
}: UseConnectSessionOptions) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [shortSlug, setShortSlug] = useState<string | null>(null);
  const [longSlug, setLongSlug] = useState<string | null>(null);
  const [hostPeerId, setHostPeerId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const renewalIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createSessionMutation = api.connect.createSession.useMutation();
  const joinSessionMutation = api.connect.joinSession.useMutation();
  const leaveSessionMutation = api.connect.leaveSession.useMutation();
  const heartbeatMutation = api.connect.heartbeat.useMutation();
  const destroySessionMutation = api.connect.destroySession.useMutation();

  // Create session (host only)
  const createSession = useCallback(async (characterOverride?: CharacterData, password?: string) => {
    const charToUse = characterOverride ?? character;
    if (!peerId || !charToUse) return null;

    try {
      const session = await createSessionMutation.mutateAsync({
        hostPeerId: peerId,
        characterName: charToUse.name,
        characterAvatar: charToUse.avatar,
        maxParticipants: CONNECT_CONFIG.MAX_PARTICIPANTS,
        password: password || undefined,
      });

      setSessionId(session.id);
      setShortSlug(session.shortSlug);
      setLongSlug(session.longSlug);
      setHostPeerId(peerId);
      setIsReady(true);

      onSessionCreated?.({
        shortSlug: session.shortSlug,
        longSlug: session.longSlug,
        sessionId: session.id,
      });

      // Start heartbeat
      renewalIntervalRef.current = setInterval(() => {
        heartbeatMutation.mutate({ slug: session.shortSlug });
      }, CONNECT_CONFIG.HEARTBEAT_INTERVAL);

      return session;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create session";
      onError?.(message);
      return null;
    }
  }, [
    peerId,
    character,
    createSessionMutation,
    heartbeatMutation,
    onSessionCreated,
    onError,
  ]);

  // Join session (guest only)
  const joinSession = useCallback(async (characterOverride?: CharacterData, password?: string) => {
    const charToUse = characterOverride ?? character;
    if (!peerId || !charToUse || !slug) return null;

    try {
      const result = await joinSessionMutation.mutateAsync({
        slug,
        peerId,
        characterName: charToUse.name,
        characterAvatar: charToUse.avatar,
        password: password || undefined,
      });

      setSessionId(result.sessionId);
      setShortSlug(slug);
      setHostPeerId(result.hostPeerId);
      setIsReady(true);

      onSessionJoined?.(result.hostPeerId);

      // Start heartbeat
      renewalIntervalRef.current = setInterval(() => {
        heartbeatMutation.mutate({ slug });
      }, CONNECT_CONFIG.HEARTBEAT_INTERVAL);

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to join session";
      onError?.(message);
      return null;
    }
  }, [
    peerId,
    character,
    slug,
    joinSessionMutation,
    heartbeatMutation,
    onSessionJoined,
    onError,
  ]);

  // Leave session
  const leaveSession = useCallback(() => {
    if (renewalIntervalRef.current) {
      clearInterval(renewalIntervalRef.current);
      renewalIntervalRef.current = null;
    }

    if (sessionId && peerId) {
      if (isHost && shortSlug) {
        // Host destroys session
        destroySessionMutation.mutate({ slug: shortSlug, hostPeerId: peerId });
      } else {
        // Guest leaves session
        leaveSessionMutation.mutate({ sessionId, peerId });
      }
    }

    setSessionId(null);
    setShortSlug(null);
    setLongSlug(null);
    setHostPeerId(null);
    setIsReady(false);
  }, [
    sessionId,
    peerId,
    isHost,
    shortSlug,
    destroySessionMutation,
    leaveSessionMutation,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renewalIntervalRef.current) {
        clearInterval(renewalIntervalRef.current);
      }
    };
  }, []);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionId && peerId) {
        const data = JSON.stringify({
          sessionId,
          peerId,
          isHost,
          slug: shortSlug,
        });
        navigator.sendBeacon("/api/connect/leave", data);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [sessionId, peerId, isHost, shortSlug]);

  return {
    sessionId,
    shortSlug,
    longSlug,
    hostPeerId,
    isReady,
    createSession,
    joinSession,
    leaveSession,
    isCreating: createSessionMutation.isPending,
    isJoining: joinSessionMutation.isPending,
    error:
      createSessionMutation.error?.message ||
      joinSessionMutation.error?.message,
  };
}
