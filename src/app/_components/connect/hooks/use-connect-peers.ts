"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { DataConnection } from "peerjs";
import { useWebRTCPeer } from "~/app/_components/p2p/webrtc-provider";
import {
  ConnectMessage,
  type ConnectMessageType,
  type CharacterData,
  type ChatMessageType,
  type ParticipantStatus,
} from "~/lib/connect/messages";
import { CONNECT_CONFIG } from "~/lib/connect";

export interface Participant {
  peerId: string;
  status: ParticipantStatus;
  character: CharacterData | null; // null when pending
  connection: DataConnection | null;
  autoReplyEnabled: boolean;
}

interface UseConnectPeersOptions {
  isHost: boolean;
  hostPeerId: string | null;
  myCharacter: CharacterData | null;
  onMessage?: (message: ChatMessageType) => void;
  onParticipantJoined?: (participant: Participant) => void;
  onParticipantLeft?: (peerId: string) => void;
  onTyping?: (peerId: string, isTyping: boolean) => void;
  onThinking?: (peerId: string, isThinking: boolean, timestamp: number) => void;
}

export function useConnectPeers({
  isHost,
  hostPeerId,
  myCharacter,
  onMessage,
  onParticipantJoined,
  onParticipantLeft,
  onTyping,
  onThinking,
}: UseConnectPeersOptions) {
  const { peer, peerId: myPeerId } = useWebRTCPeer();
  const [participants, setParticipants] = useState<Map<string, Participant>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([]);
  const [thinkingPeers, setThinkingPeers] = useState<Set<string>>(new Set());

  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const pendingConnectionsRef = useRef<Set<string>>(new Set());

  // Use refs to avoid stale closures in event handlers
  const myCharacterRef = useRef(myCharacter);
  const myPeerIdRef = useRef(myPeerId);

  // Keep refs in sync
  useEffect(() => {
    myCharacterRef.current = myCharacter;
  }, [myCharacter]);

  useEffect(() => {
    myPeerIdRef.current = myPeerId;
  }, [myPeerId]);

  // Ref for handleMessage to avoid stale closures
  const handleMessageRef = useRef<(data: unknown, fromPeerId: string) => void>(() => {});

  // Send message to all peers
  const broadcast = useCallback(
    (message: ConnectMessageType) => {
      const data = JSON.stringify(message);
      connectionsRef.current.forEach((conn) => {
        if (conn.open) {
          conn.send(data);
        }
      });
    },
    []
  );

  // Send message to specific peer
  const sendTo = useCallback(
    (peerId: string, message: ConnectMessageType) => {
      const conn = connectionsRef.current.get(peerId);
      if (conn?.open) {
        conn.send(JSON.stringify(message));
      }
    },
    []
  );

  // Handle incoming message
  const handleMessage = useCallback(
    (data: unknown, fromPeerId: string) => {
      try {
        const parsed =
          typeof data === "string" ? JSON.parse(data) : data;
        const result = ConnectMessage.safeParse(parsed);

        if (!result.success) {
          console.warn("Invalid message:", result.error);
          return;
        }

        const message = result.data;

        switch (message.type) {
          case "PeerConnecting": {
            // Someone joined the link but hasn't selected character yet
            setParticipants((prev) => {
              const updated = new Map(prev);
              if (!updated.has(message.peerId)) {
                updated.set(message.peerId, {
                  peerId: message.peerId,
                  status: "pending",
                  character: null,
                  connection: connectionsRef.current.get(message.peerId) ?? null,
                  autoReplyEnabled: true,
                });
              }
              return updated;
            });
            break;
          }

          case "CharacterSync": {
            setParticipants((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(message.peerId);
              const wasNew = !existing || existing.status === "pending";
              updated.set(message.peerId, {
                peerId: message.peerId,
                status: "ready",
                character: message.character,
                connection: existing?.connection ?? connectionsRef.current.get(message.peerId) ?? null,
                autoReplyEnabled: existing?.autoReplyEnabled ?? true,
              });
              return updated;
            });

            const participant: Participant = {
              peerId: message.peerId,
              status: "ready",
              character: message.character,
              connection: connectionsRef.current.get(message.peerId) ?? null,
              autoReplyEnabled: true,
            };
            onParticipantJoined?.(participant);
            break;
          }

          case "ChatMessage": {
            const chatMsg = message as ChatMessageType;
            setChatHistory((prev) => {
              // Deduplicate by message ID
              if (prev.some((m) => m.id === chatMsg.id)) {
                return prev;
              }
              return [...prev, chatMsg];
            });
            onMessage?.(chatMsg);
            break;
          }

          case "Typing": {
            onTyping?.(message.peerId, message.isTyping);
            break;
          }

          case "Thinking": {
            setThinkingPeers((prev) => {
              const updated = new Set(prev);
              if (message.isThinking) {
                updated.add(message.peerId);
              } else {
                updated.delete(message.peerId);
              }
              return updated;
            });
            // Notify about thinking event with timestamp for debounce logic
            onThinking?.(message.peerId, message.isThinking, Date.now());
            break;
          }

          case "PeerState": {
            setParticipants((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(message.peerId);
              if (existing) {
                updated.set(message.peerId, {
                  ...existing,
                  autoReplyEnabled: message.autoReplyEnabled,
                });
              }
              return updated;
            });
            break;
          }

          case "PeerJoined": {
            // Connect to new peer if we're not already connected
            if (
              peer &&
              message.peerId !== myPeerId &&
              !connectionsRef.current.has(message.peerId) &&
              !pendingConnectionsRef.current.has(message.peerId)
            ) {
              connectToPeer(message.peerId);
            }
            break;
          }

          case "PeerLeft": {
            handlePeerDisconnect(message.peerId);
            break;
          }

          case "RequestSync": {
            // Send our character info to the requester
            if (myCharacter && myPeerId) {
              sendTo(message.peerId, {
                type: "CharacterSync",
                character: myCharacter,
                peerId: myPeerId,
              });
            }

            // If we're host, send session info
            if (isHost) {
              // Only include participants with characters (ready status)
              const participantList = Array.from(participants.values())
                .filter((p) => p.status === "ready" && p.character !== null)
                .map((p) => ({
                  peerId: p.peerId,
                  character: p.character!,
                  autoReplyEnabled: p.autoReplyEnabled,
                }));

              // Add ourselves
              if (myCharacter && myPeerId) {
                participantList.push({
                  peerId: myPeerId,
                  character: myCharacter,
                  autoReplyEnabled,
                });
              }

              sendTo(message.peerId, {
                type: "SessionInfo",
                participants: participantList,
                chatHistory: chatHistory.map(({ type, ...rest }) => rest),
              });
            }
            break;
          }

          case "SessionInfo": {
            // Received from host, sync state
            message.participants.forEach((p) => {
              if (p.peerId !== myPeerId) {
                setParticipants((prev) => {
                  const updated = new Map(prev);
                  updated.set(p.peerId, {
                    peerId: p.peerId,
                    status: "ready",
                    character: p.character,
                    connection: connectionsRef.current.get(p.peerId) ?? null,
                    autoReplyEnabled: p.autoReplyEnabled,
                  });
                  return updated;
                });

                // Connect to other participants
                if (
                  peer &&
                  !connectionsRef.current.has(p.peerId) &&
                  !pendingConnectionsRef.current.has(p.peerId)
                ) {
                  connectToPeer(p.peerId);
                }
              }
            });

            // Sync chat history
            message.chatHistory.forEach((msg) => {
              setChatHistory((prev) => {
                if (prev.some((m) => m.id === msg.id)) {
                  return prev;
                }
                return [
                  ...prev,
                  { ...msg, type: "ChatMessage" as const },
                ].sort((a, b) => a.timestamp - b.timestamp);
              });
            });
            break;
          }

          case "AITurn": {
            // Handle AI turn coordination - not implemented yet
            break;
          }
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    },
    [
      peer,
      myPeerId,
      myCharacter,
      isHost,
      participants,
      autoReplyEnabled,
      chatHistory,
      onMessage,
      onParticipantJoined,
      onTyping,
      sendTo,
    ]
  );

  // Keep handleMessageRef in sync
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  // Connect to a peer
  const connectToPeer = useCallback(
    (targetPeerId: string) => {
      if (!peer || !myPeerId || targetPeerId === myPeerId) return;
      if (connectionsRef.current.has(targetPeerId)) return;
      if (pendingConnectionsRef.current.has(targetPeerId)) return;

      pendingConnectionsRef.current.add(targetPeerId);

      console.log(`[Connect] Connecting to peer: ${targetPeerId}`);
      const conn = peer.connect(targetPeerId, { reliable: true });

      conn.on("open", () => {
        console.log(`[Connect] Connected to peer: ${targetPeerId}`);
        connectionsRef.current.set(targetPeerId, conn);
        pendingConnectionsRef.current.delete(targetPeerId);

        const char = myCharacterRef.current;
        const pid = myPeerIdRef.current;

        // Send PeerConnecting first (we may not have character yet)
        if (pid) {
          conn.send(
            JSON.stringify({
              type: "PeerConnecting",
              peerId: pid,
            })
          );
        }

        // If we already have character, send CharacterSync too
        if (char && pid) {
          conn.send(
            JSON.stringify({
              type: "CharacterSync",
              character: char,
              peerId: pid,
            })
          );
        }

        // Request sync from host or other peers
        if (pid) {
          conn.send(
            JSON.stringify({
              type: "RequestSync",
              peerId: pid,
            })
          );
        }

        setIsConnected(true);
      });

      conn.on("data", (data) => {
        handleMessageRef.current(data, targetPeerId);
      });

      conn.on("close", () => {
        handlePeerDisconnect(targetPeerId);
      });

      conn.on("error", (err) => {
        console.error(`[Connect] Connection error with ${targetPeerId}:`, err);
        pendingConnectionsRef.current.delete(targetPeerId);
      });

      // Timeout for connection
      setTimeout(() => {
        if (pendingConnectionsRef.current.has(targetPeerId)) {
          pendingConnectionsRef.current.delete(targetPeerId);
          console.warn(`[Connect] Connection timeout for ${targetPeerId}`);
        }
      }, CONNECT_CONFIG.CONNECTION_TIMEOUT);
    },
    [peer, myPeerId]
  );

  // Handle peer disconnect
  const handlePeerDisconnect = useCallback(
    (peerId: string) => {
      connectionsRef.current.delete(peerId);
      pendingConnectionsRef.current.delete(peerId);

      setParticipants((prev) => {
        const updated = new Map(prev);
        updated.delete(peerId);
        return updated;
      });

      onParticipantLeft?.(peerId);

      // Check if we're still connected to anyone
      if (connectionsRef.current.size === 0) {
        setIsConnected(false);
      }
    },
    [onParticipantLeft]
  );

  // Listen for incoming connections (for host)
  useEffect(() => {
    if (!peer || !myPeerId) return;

    const handleConnection = (conn: DataConnection) => {
      console.log(`[Connect] Incoming connection from: ${conn.peer}`);

      // Add as pending participant immediately
      setParticipants((prev) => {
        const updated = new Map(prev);
        if (!updated.has(conn.peer)) {
          updated.set(conn.peer, {
            peerId: conn.peer,
            status: "connecting",
            character: null,
            connection: conn,
            autoReplyEnabled: true,
          });
        }
        return updated;
      });

      conn.on("open", () => {
        connectionsRef.current.set(conn.peer, conn);
        setIsConnected(true);

        // Update to pending status
        setParticipants((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(conn.peer);
          if (existing && existing.status === "connecting") {
            updated.set(conn.peer, {
              ...existing,
              status: "pending",
              connection: conn,
            });
          }
          return updated;
        });

        // Send our character info using refs for latest values
        const char = myCharacterRef.current;
        const pid = myPeerIdRef.current;
        if (char && pid) {
          conn.send(
            JSON.stringify({
              type: "CharacterSync",
              character: char,
              peerId: pid,
            })
          );
        }

        // Broadcast that new peer is connecting
        broadcast({
          type: "PeerConnecting",
          peerId: conn.peer,
        });
      });

      conn.on("data", (data) => {
        handleMessageRef.current(data, conn.peer);
      });

      conn.on("close", () => {
        handlePeerDisconnect(conn.peer);

        // Broadcast that peer left
        broadcast({
          type: "PeerLeft",
          peerId: conn.peer,
        });
      });
    };

    peer.on("connection", handleConnection);

    return () => {
      peer.off("connection", handleConnection);
    };
  }, [peer, myPeerId, handlePeerDisconnect, broadcast]);

  // Connect to host immediately when joining (before character selection)
  useEffect(() => {
    if (!isHost && hostPeerId && peer && myPeerId && hostPeerId !== myPeerId) {
      connectToPeer(hostPeerId);
    }
  }, [isHost, hostPeerId, peer, myPeerId, connectToPeer]);

  // Send CharacterSync when character is selected (after connection is established)
  useEffect(() => {
    if (!isHost && myCharacter && myPeerId && connectionsRef.current.size > 0) {
      // Broadcast our character to all connected peers
      broadcast({
        type: "CharacterSync",
        character: myCharacter,
        peerId: myPeerId,
      });
    }
  }, [isHost, myCharacter, myPeerId, broadcast]);

  // Send a chat message
  const sendChatMessage = useCallback(
    (content: string, isHuman: boolean = true) => {
      if (!myPeerId || !myCharacter) return null;

      const message: ChatMessageType = {
        type: "ChatMessage",
        id: crypto.randomUUID(),
        senderId: myPeerId,
        characterName: myCharacter.name,
        content,
        isHuman,
        timestamp: Date.now(),
      };

      // Add to local history
      setChatHistory((prev) => [...prev, message]);

      // Broadcast to all peers
      broadcast(message);

      return message;
    },
    [myPeerId, myCharacter, broadcast]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!myPeerId || !myCharacter) return;

      broadcast({
        type: "Typing",
        peerId: myPeerId,
        characterName: myCharacter.name,
        isTyping,
      });
    },
    [myPeerId, myCharacter, broadcast]
  );

  // Send thinking indicator (AI generating)
  const sendThinking = useCallback(
    (isThinking: boolean) => {
      if (!myPeerId || !myCharacter) return;

      // Update local state
      setThinkingPeers((prev) => {
        const updated = new Set(prev);
        if (isThinking) {
          updated.add(myPeerId);
        } else {
          updated.delete(myPeerId);
        }
        return updated;
      });

      broadcast({
        type: "Thinking",
        peerId: myPeerId,
        characterName: myCharacter.name,
        isThinking,
      });
    },
    [myPeerId, myCharacter, broadcast]
  );

  // Toggle auto-reply
  const toggleAutoReply = useCallback(
    (enabled: boolean) => {
      setAutoReplyEnabled(enabled);

      if (myPeerId) {
        broadcast({
          type: "PeerState",
          peerId: myPeerId,
          autoReplyEnabled: enabled,
        });
      }
    },
    [myPeerId, broadcast]
  );

  // Disconnect all
  const disconnectAll = useCallback(() => {
    if (myPeerId) {
      broadcast({
        type: "PeerLeft",
        peerId: myPeerId,
      });
    }

    connectionsRef.current.forEach((conn) => {
      conn.close();
    });
    connectionsRef.current.clear();
    pendingConnectionsRef.current.clear();
    setParticipants(new Map());
    setIsConnected(false);
  }, [myPeerId, broadcast]);

  return {
    participants: Array.from(participants.values()),
    isConnected,
    autoReplyEnabled,
    chatHistory,
    thinkingPeers: Array.from(thinkingPeers),
    sendChatMessage,
    sendTyping,
    sendThinking,
    toggleAutoReply,
    disconnectAll,
    connectToPeer,
  };
}
