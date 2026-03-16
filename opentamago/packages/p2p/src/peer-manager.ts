import Peer from "peerjs";

export interface PeerConfig {
  host?: string;
  path?: string;
  debug?: 0 | 1 | 2 | 3;
  iceServers?: RTCIceServer[];
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeer(config?: PeerConfig): Peer {
  return new Peer({
    host: config?.host ?? "0.peerjs.com",
    path: config?.path ?? "/",
    debug: config?.debug ?? 2,
    config: {
      iceServers: config?.iceServers ?? DEFAULT_ICE_SERVERS,
    },
  });
}

export function waitForPeerOpen(peer: Peer): Promise<string> {
  if (peer.id) return Promise.resolve(peer.id);
  return new Promise((resolve, reject) => {
    peer.on("open", resolve);
    peer.on("error", reject);
  });
}
