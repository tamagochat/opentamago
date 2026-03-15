import { useCallback, useEffect, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import type Peer from "peerjs";

import type {
  CharacterInfo,
  ChatMessageType,
  ConnectMessageType,
  SystemMessageType,
} from "@acme/p2p/messages";

type ChatItem = ChatMessageType | SystemMessageType;

interface ConnectedPeer {
  peerId: string;
  conn: DataConnection;
  character?: CharacterInfo;
  autoReplyEnabled: boolean;
}

interface UseConnectPeersOptions {
  peer: Peer | null;
  peerId: string | null;
  isHost: boolean;
  character: CharacterInfo | null;
  hostPeerId?: string;
}

export function useConnectPeers({
  peer,
  peerId,
  isHost,
  character,
  hostPeerId,
}: UseConnectPeersOptions) {
  const [peers, setPeers] = useState<Map<string, ConnectedPeer>>(new Map());
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [typingPeers, setTypingPeers] = useState<Set<string>>(new Set());

  const peersRef = useRef(peers);
  peersRef.current = peers;

  // Broadcast message to all connected peers
  const broadcast = useCallback(
    (msg: ConnectMessageType) => {
      peersRef.current.forEach((p) => {
        if (p.conn.open) {
          p.conn.send(msg);
        }
      });
    },
    []
  );

  // Send chat message
  const sendMessage = useCallback(
    (content: string) => {
      if (!peerId || !character) return;

      const msg: ChatMessageType = {
        type: "ChatMessage",
        id: crypto.randomUUID(),
        senderId: peerId,
        characterName: character.name,
        content,
        isHuman: true,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, msg]);
      broadcast(msg);
    },
    [peerId, character, broadcast]
  );

  // Handle incoming data from a peer
  const handleData = useCallback(
    (remotePeerId: string, data: unknown) => {
      const msg = data as ConnectMessageType;
      if (!msg?.type) return;

      switch (msg.type) {
        case "CharacterSync": {
          setPeers((prev) => {
            const next = new Map(prev);
            const existing = next.get(msg.peerId);
            if (existing) {
              next.set(msg.peerId, { ...existing, character: msg.character });
            }
            return next;
          });
          break;
        }

        case "ChatMessage": {
          setMessages((prev) => {
            // Deduplicate by ID
            if (prev.some((m) => "id" in m && m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // If host, relay to other peers
          if (isHost) {
            peersRef.current.forEach((p) => {
              if (p.peerId !== remotePeerId && p.conn.open) {
                p.conn.send(msg);
              }
            });
          }
          break;
        }

        case "Typing": {
          setTypingPeers((prev) => {
            const next = new Set(prev);
            if (msg.isTyping) {
              next.add(msg.peerId);
            } else {
              next.delete(msg.peerId);
            }
            return next;
          });
          break;
        }

        case "SystemMessage": {
          setMessages((prev) => {
            if (prev.some((m) => "id" in m && m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          break;
        }

        case "PeerJoined": {
          const sysMsg: SystemMessageType = {
            type: "SystemMessage",
            id: crypto.randomUUID(),
            event: "joined",
            characterName: msg.characterName,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, sysMsg]);

          if (isHost) {
            // Relay to others
            peersRef.current.forEach((p) => {
              if (p.peerId !== remotePeerId && p.conn.open) {
                p.conn.send(sysMsg);
              }
            });
          }
          break;
        }

        case "PeerLeft": {
          const leftMsg: SystemMessageType = {
            type: "SystemMessage",
            id: crypto.randomUUID(),
            event: "left",
            characterName: msg.characterName ?? "Unknown",
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, leftMsg]);

          setPeers((prev) => {
            const next = new Map(prev);
            next.delete(msg.peerId);
            return next;
          });

          if (isHost) {
            peersRef.current.forEach((p) => {
              if (p.peerId !== remotePeerId && p.conn.open) {
                p.conn.send(leftMsg);
              }
            });
          }
          break;
        }

        case "RequestSync": {
          // Host sends session info to requesting peer
          if (isHost && character) {
            const peerConn = peersRef.current.get(remotePeerId);
            if (peerConn?.conn.open) {
              const participants = Array.from(peersRef.current.values())
                .filter((p) => p.character)
                .map((p) => ({
                  peerId: p.peerId,
                  character: p.character!,
                  autoReplyEnabled: p.autoReplyEnabled,
                }));

              // Add self
              participants.unshift({
                peerId: peerId!,
                character,
                autoReplyEnabled: false,
              });

              peerConn.conn.send({
                type: "SessionInfo",
                participants,
                chatHistory: messages
                  .filter((m): m is ChatMessageType => m.type === "ChatMessage")
                  .map(({ type: _, ...rest }) => rest),
              });
            }
          }
          break;
        }

        case "SessionInfo": {
          // Joiner receives session info from host
          if (!isHost) {
            // Add chat history
            const history: ChatItem[] = msg.chatHistory.map((m) => ({
              type: "ChatMessage" as const,
              ...m,
            }));
            setMessages((prev) => [...history, ...prev]);
          }
          break;
        }

        case "PeerState": {
          setPeers((prev) => {
            const next = new Map(prev);
            const existing = next.get(msg.peerId);
            if (existing) {
              next.set(msg.peerId, {
                ...existing,
                autoReplyEnabled: msg.autoReplyEnabled,
              });
            }
            return next;
          });
          break;
        }
      }
    },
    [isHost, peerId, character, broadcast, messages]
  );

  // Set up connection handling
  const setupConnection = useCallback(
    (conn: DataConnection) => {
      const remotePeerId = conn.peer;

      conn.on("open", () => {
        setPeers((prev) => {
          const next = new Map(prev);
          next.set(remotePeerId, {
            peerId: remotePeerId,
            conn,
            autoReplyEnabled: false,
          });
          return next;
        });

        // Send our character info
        if (character) {
          conn.send({
            type: "CharacterSync",
            character,
            peerId: peerId!,
          });
        }
      });

      conn.on("data", (data) => {
        handleData(remotePeerId, data);
      });

      conn.on("close", () => {
        setPeers((prev) => {
          const next = new Map(prev);
          next.delete(remotePeerId);
          return next;
        });
      });
    },
    [character, peerId, handleData]
  );

  // Host: listen for incoming connections
  useEffect(() => {
    if (!peer || !isHost) return;

    const handleConnection = (conn: DataConnection) => {
      setupConnection(conn);
    };

    peer.on("connection", handleConnection);
    return () => {
      peer.off("connection", handleConnection);
    };
  }, [peer, isHost, setupConnection]);

  // Guest: connect to host
  useEffect(() => {
    if (!peer || isHost || !hostPeerId) return;

    const conn = peer.connect(hostPeerId, { reliable: true });
    setupConnection(conn);

    conn.on("open", () => {
      // Request sync from host
      conn.send({ type: "RequestSync", peerId: peerId! });
    });
  }, [peer, isHost, hostPeerId, peerId, setupConnection]);

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!peerId || !character) return;
      broadcast({
        type: "Typing",
        peerId,
        characterName: character.name,
        isTyping,
      });
    },
    [peerId, character, broadcast]
  );

  return {
    peers: Array.from(peers.values()),
    messages,
    typingPeers,
    sendMessage,
    sendTyping,
  };
}
