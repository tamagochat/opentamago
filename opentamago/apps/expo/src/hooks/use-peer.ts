import type Peer from "peerjs";
import { useEffect, useRef, useState } from "react";

export function usePeer() {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        // Lazy import to ensure WebRTC polyfill has registered globals
        // before PeerJS evaluates its supports check at module load time
        const { createPeer, waitForPeerOpen } = await import("@acme/p2p/core");
        const p = createPeer({ debug: 2 });
        await waitForPeerOpen(p);
        if (cancelled) {
          p.destroy();
          return;
        }
        peerRef.current = p;
        setPeer(p);
        setIsReady(true);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      }
    };

    void init();

    return () => {
      cancelled = true;
      peerRef.current?.destroy();
      peerRef.current = null;
    };
  }, []);

  return { peer, isReady, error };
}
