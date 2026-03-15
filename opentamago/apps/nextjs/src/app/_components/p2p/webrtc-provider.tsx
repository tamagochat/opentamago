"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import Peer, { type DataConnection } from "peerjs";
import { api } from "~/trpc/react";

interface WebRTCContextValue {
  peer: Peer | null;
  peerId: string | null;
  isConnecting: boolean;
  error: string | null;
  reconnect: () => void;
}

const WebRTCContext = createContext<WebRTCContextValue>({
  peer: null,
  peerId: null,
  isConnecting: true,
  error: null,
  reconnect: () => {},
});

// Global peer instance to survive React Strict Mode double-mounting
let globalPeer: Peer | null = null;
let globalPeerId: string | null = null;

export function WebRTCProvider({ children }: { children: ReactNode }) {
  const [peer, setPeer] = useState<Peer | null>(globalPeer);
  const [peerId, setPeerId] = useState<string | null>(globalPeerId);
  const [isConnecting, setIsConnecting] = useState(!globalPeer);
  const [error, setError] = useState<string | null>(null);
  const initializingRef = useRef(false);

  const { data: config } = api.p2p.getConfig.useQuery();

  const initPeer = useCallback(() => {
    if (!config) return;

    // Prevent double initialization
    if (initializingRef.current) return;

    // If we already have a working global peer, use it
    if (globalPeer && !globalPeer.destroyed && globalPeerId) {
      setPeer(globalPeer);
      setPeerId(globalPeerId);
      setIsConnecting(false);
      return;
    }

    initializingRef.current = true;
    setIsConnecting(true);
    setError(null);

    // Destroy existing peer if any
    if (globalPeer) {
      globalPeer.destroy();
      globalPeer = null;
      globalPeerId = null;
    }

    console.log("[WebRTC] Creating new peer...");
    const newPeer = new Peer({
      host: config.host,
      path: config.path,
      config: { iceServers: config.iceServers },
      debug: process.env.NODE_ENV === "development" ? 2 : 0,
    });

    newPeer.on("open", (id) => {
      console.log("[WebRTC] Peer connected:", id);
      globalPeer = newPeer;
      globalPeerId = id;
      setPeerId(id);
      setPeer(newPeer);
      setIsConnecting(false);
      initializingRef.current = false;
    });

    newPeer.on("error", (err) => {
      console.error("[WebRTC] Peer error:", err);
      setError(err.message || "Failed to connect to signaling server");
      setIsConnecting(false);
      initializingRef.current = false;
    });

    newPeer.on("disconnected", () => {
      console.log("[WebRTC] Peer disconnected, attempting reconnect...");
      newPeer.reconnect();
    });
  }, [config]);

  useEffect(() => {
    initPeer();

    // Only cleanup on actual unmount, not Strict Mode remount
    return () => {
      // Don't destroy peer on unmount - keep it global
      // It will be reused if component remounts
    };
  }, [initPeer]);

  const reconnect = useCallback(() => {
    // Force new peer creation
    if (globalPeer) {
      globalPeer.destroy();
      globalPeer = null;
      globalPeerId = null;
    }
    initializingRef.current = false;
    initPeer();
  }, [initPeer]);

  return (
    <WebRTCContext.Provider
      value={{ peer, peerId, isConnecting, error, reconnect }}
    >
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTCPeer() {
  return useContext(WebRTCContext);
}

export type { DataConnection };
