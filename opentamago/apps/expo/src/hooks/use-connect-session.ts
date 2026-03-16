import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useMutation } from "@tanstack/react-query";

import { CONNECT_CONFIG } from "@acme/p2p/core";

import { trpc } from "~/utils/api";

interface SessionInfo {
  id: number;
  shortSlug: string;
  longSlug: string;
  hostPeerId: string;
}

export function useConnectSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);

  const createMutation = useMutation(
    trpc.connect.createSession.mutationOptions()
  );
  const joinMutation = useMutation(
    trpc.connect.joinSession.mutationOptions()
  );
  const leaveMutation = useMutation(
    trpc.connect.leaveSession.mutationOptions()
  );
  const heartbeatMutation = useMutation(
    trpc.connect.heartbeat.mutationOptions()
  );
  const destroyMutation = useMutation(
    trpc.connect.destroySession.mutationOptions()
  );

  const sessionRef = useRef(session);
  sessionRef.current = session;

  const createSession = useCallback(
    async (opts: {
      hostPeerId: string;
      characterName: string;
      characterAvatar?: string;
      maxParticipants?: number;
      password?: string;
    }) => {
      const result = await createMutation.mutateAsync(opts);
      const info: SessionInfo = {
        id: result.id,
        shortSlug: result.shortSlug,
        longSlug: result.longSlug,
        hostPeerId: result.hostPeerId,
      };
      setSession(info);
      return info;
    },
    [createMutation]
  );

  const joinSession = useCallback(
    async (opts: {
      slug: string;
      peerId: string;
      characterName: string;
      characterAvatar?: string;
      password?: string;
    }) => {
      const result = await joinMutation.mutateAsync(opts);
      return result;
    },
    [joinMutation]
  );

  const leaveSession = useCallback(
    async (sessionId: number, peerId: string) => {
      await leaveMutation.mutateAsync({ sessionId, peerId });
      setSession(null);
    },
    [leaveMutation]
  );

  const destroySession = useCallback(
    async (slug: string, hostPeerId: string) => {
      await destroyMutation.mutateAsync({ slug, hostPeerId });
      setSession(null);
    },
    [destroyMutation]
  );

  // Heartbeat to keep session alive
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      void heartbeatMutation.mutateAsync({ slug: session.shortSlug });
    }, CONNECT_CONFIG.HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [session, heartbeatMutation]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        // App going to background - could leave session or just heartbeat
        if (sessionRef.current) {
          void heartbeatMutation.mutateAsync({
            slug: sessionRef.current.shortSlug,
          });
        }
      }
    });

    return () => subscription.remove();
  }, [heartbeatMutation]);

  return {
    session,
    createSession,
    joinSession,
    leaveSession,
    destroySession,
    isCreating: createMutation.isPending,
    isJoining: joinMutation.isPending,
  };
}
