"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "~/i18n/routing";
import { toast } from "sonner";
import { useConnectSession } from "~/lib/db/hooks";
import { useConnectStore } from "~/lib/stores/connect-store";
import { useBeforeUnload } from "~/lib/connect/navigation-detector";

interface UseConnectNavigationOptions {
  isInChat: boolean;
  participantCount: number;
  onNavigateAway?: () => void;
}

/**
 * Handles navigation events for connect sessions
 * - Shows toast when navigating away from chat
 * - Updates wasInChat flag in RxDB
 * - Handles tab close cleanup
 */
export function useConnectNavigation({
  isInChat,
  participantCount,
  onNavigateAway,
}: UseConnectNavigationOptions) {
  const pathname = usePathname();
  const { updateWasInChat, clearSession } = useConnectSession();
  const { sessionInfo } = useConnectStore();
  const previousPathnameRef = useRef(pathname);
  const isInChatRef = useRef(isInChat);

  // Keep refs up to date
  useEffect(() => {
    isInChatRef.current = isInChat;
  }, [isInChat]);

  // Detect navigation away from chat
  useEffect(() => {
    const isNavigatingAway =
      pathname !== previousPathnameRef.current &&
      isInChatRef.current &&
      !pathname.includes("/p2p/connect");

    if (isNavigatingAway && sessionInfo) {
      // Update RxDB flag
      void updateWasInChat(true);

      // Show toast
      toast.info("Chat continues in background", {
        description:
          participantCount > 0
            ? `${participantCount} participant${participantCount !== 1 ? "s" : ""} connected`
            : "Session active",
        duration: 5000,
      });

      // Call callback
      onNavigateAway?.();
    }

    previousPathnameRef.current = pathname;
  }, [pathname, sessionInfo, participantCount, updateWasInChat, onNavigateAway]);

  // Handle returning to chat
  useEffect(() => {
    const isReturningToChat =
      pathname.includes("/p2p/connect") &&
      previousPathnameRef.current &&
      !previousPathnameRef.current.includes("/p2p/connect");

    if (isReturningToChat && sessionInfo) {
      // Update RxDB flag
      void updateWasInChat(false);
    }
  }, [pathname, sessionInfo, updateWasInChat]);

  // Handle tab close/refresh - clear session completely
  useBeforeUnload(
    useCallback(() => {
      if (sessionInfo) {
        void clearSession();
      }
    }, [sessionInfo, clearSession])
  );
}
