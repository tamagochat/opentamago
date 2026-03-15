import { useCallback, useEffect, useRef, useState } from "react";
import type Peer from "peerjs";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export function usePeer(routerKey: "p2p" | "connect" = "p2p") {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<Peer | null>(null);

  const configQuery = useQuery(
    routerKey === "p2p"
      ? trpc.p2p.getConfig.queryOptions()
      : trpc.connect.getConfig.queryOptions()
  );

  const initPeer = useCallback(async () => {
    if (peerRef.current) return;
    if (!configQuery.data) return;

    try {
      const { createPeer, waitForPeerOpen } = await import("@acme/p2p/core");
      const newPeer = createPeer({
        host: configQuery.data.host,
        path: configQuery.data.path,
        iceServers: configQuery.data.iceServers as { urls: string }[],
      });

      peerRef.current = newPeer;
      const id = await waitForPeerOpen(newPeer);
      setPeer(newPeer);
      setPeerId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize peer");
    }
  }, [configQuery.data]);

  useEffect(() => {
    if (configQuery.data) {
      void initPeer();
    }

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
        setPeer(null);
        setPeerId(null);
      }
    };
  }, [configQuery.data, initPeer]);

  return { peer, peerId, error, isLoading: configQuery.isLoading };
}
