"use client";

import { useEffect, useRef, useCallback } from "react";
import { api } from "~/trpc/react";
import { P2P_CONFIG } from "~/lib/p2p";

interface UseUploaderChannelOptions {
  uploaderPeerId: string | null;
  file: File | null;
  password?: string;
  onChannelCreated?: (channel: {
    shortSlug: string;
    longSlug: string;
    secret: string;
  }) => void;
}

export function useUploaderChannel({
  uploaderPeerId,
  file,
  password,
  onChannelCreated,
}: UseUploaderChannelOptions) {
  const renewalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<{
    shortSlug: string;
    longSlug: string;
    secret: string;
  } | null>(null);

  const createChannelMutation = api.p2p.createChannel.useMutation();
  const renewChannelMutation = api.p2p.renewChannel.useMutation();
  const destroyChannelMutation = api.p2p.destroyChannel.useMutation();

  const createChannel = useCallback(async () => {
    if (!uploaderPeerId || !file) return null;

    try {
      const channel = await createChannelMutation.mutateAsync({
        uploaderPeerId,
        fileName: file.name,
        fileSize: file.size,
        password: password || undefined,
      });

      channelRef.current = {
        shortSlug: channel.shortSlug,
        longSlug: channel.longSlug,
        secret: channel.secret,
      };

      onChannelCreated?.(channelRef.current);

      // Start renewal interval
      renewalIntervalRef.current = setInterval(() => {
        if (channelRef.current) {
          renewChannelMutation.mutate({
            slug: channelRef.current.shortSlug,
            secret: channelRef.current.secret,
          });
        }
      }, P2P_CONFIG.RENEWAL_INTERVAL);

      return channel;
    } catch (error) {
      console.error("Failed to create channel:", error);
      return null;
    }
  }, [uploaderPeerId, file, password, createChannelMutation, renewChannelMutation, onChannelCreated]);

  const destroyChannel = useCallback(() => {
    if (renewalIntervalRef.current) {
      clearInterval(renewalIntervalRef.current);
      renewalIntervalRef.current = null;
    }

    if (channelRef.current) {
      // Use sendBeacon for reliable delivery on page unload
      const slug = channelRef.current.shortSlug;
      const secret = channelRef.current.secret;

      // Try to destroy via mutation first
      destroyChannelMutation.mutate({ slug, secret });
      channelRef.current = null;
    }
  }, [destroyChannelMutation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyChannel();
    };
  }, []);

  // Handle page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        // Send beacon for reliable delivery
        const data = JSON.stringify({
          slug: channelRef.current.shortSlug,
          secret: channelRef.current.secret,
        });
        navigator.sendBeacon("/api/p2p/destroy", data);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return {
    createChannel,
    destroyChannel,
    channel: channelRef.current,
    isCreating: createChannelMutation.isPending,
    error: createChannelMutation.error?.message,
  };
}
