"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { DataConnection } from "peerjs";
import { useWebRTCPeer } from "~/app/_components/p2p/webrtc-provider";
import {
  ConnectMessage,
  type ConnectMessageType,
  type CharacterData,
  type CharacterInfo,
  type ChatMessageType,
  type SystemMessageType,
  type ParticipantStatus,
} from "~/lib/connect/messages";
import { CONNECT_CONFIG } from "~/lib/connect";

export interface Participant {
  peerId: string;
  status: ParticipantStatus;
  character: CharacterInfo | null; // null when pending - only contains name and avatar
  connection: DataConnection | null;
  autoReplyEnabled: boolean;
}

// Union type for chat items (regular messages + system messages)
export type ChatItemType = ChatMessageType | SystemMessageType;

interface UseConnectPeersOptions {
  isHost: boolean;
  hostPeerId: string | null;
  myCharacter: CharacterData | null;
  sessionId?: string | null; // Track session to reset state on room change
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
  sessionId,
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
  const [chatHistory, setChatHistory] = useState<ChatItemType[]>([]);
  const [thinkingPeers, setThinkingPeers] = useState<Set<string>>(new Set());

  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const pendingConnectionsRef = useRef<Set<string>>(new Set());

  // Track last heartbeat time for each peer (host only)
  const lastHeartbeatRef = useRef<Map<string, number>>(new Map());

  // Track current session to detect room changes
  const currentSessionRef = useRef<string | null>(sessionId ?? null);

  // Use refs to avoid stale closures in event handlers
  const myCharacterRef = useRef(myCharacter);
  const myPeerIdRef = useRef(myPeerId);
  const participantsRef = useRef(participants);
  const chatHistoryRef = useRef(chatHistory);
  const autoReplyEnabledRef = useRef(autoReplyEnabled);

  // Keep refs in sync
  useEffect(() => {
    myCharacterRef.current = myCharacter;
  }, [myCharacter]);

  useEffect(() => {
    myPeerIdRef.current = myPeerId;
  }, [myPeerId]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    chatHistoryRef.current = chatHistory;
  }, [chatHistory]);

  useEffect(() => {
    autoReplyEnabledRef.current = autoReplyEnabled;
  }, [autoReplyEnabled]);

  // Reset state when session changes (joining a new room)
  useEffect(() => {
    const newSessionId = sessionId ?? null;
    const previousSessionId = currentSessionRef.current;

    // If session changed (and not initial render)
    if (previousSessionId !== null && newSessionId !== previousSessionId) {
      console.log(`[Session] Detected session change from ${previousSessionId} to ${newSessionId}, resetting state`);

      // Close all existing connections
      connectionsRef.current.forEach((conn) => {
        conn.close();
      });
      connectionsRef.current.clear();
      pendingConnectionsRef.current.clear();

      // Clear all state
      setParticipants(new Map());
      setIsConnected(false);
      setAutoReplyEnabled(true);
      setChatHistory([]);
      setThinkingPeers(new Set());
      lastHeartbeatRef.current.clear();
    }

    // Update current session ref
    currentSessionRef.current = newSessionId;
  }, [sessionId]);

  // Ref for handleMessage to avoid stale closures
  const handleMessageRef = useRef<(data: unknown, fromPeerId: string) => void>(() => {});

  // Send message to all peers
  const broadcast = useCallback(
    (message: ConnectMessageType) => {
      console.log("[broadcast] Sending message:", {
        type: message.type,
        connectionCount: connectionsRef.current.size,
        connections: Array.from(connectionsRef.current.entries()).map(([peerId, conn]) => ({
          peerId,
          isOpen: conn.open,
        })),
      });
      const data = JSON.stringify(message);
      let sentCount = 0;
      connectionsRef.current.forEach((conn, peerId) => {
        if (conn.open) {
          console.log(`[broadcast] Sending to peer ${peerId}`);
          conn.send(data);
          sentCount++;
        } else {
          console.warn(`[broadcast] Connection to peer ${peerId} is not open`);
        }
      });
      console.log(`[broadcast] Sent to ${sentCount}/${connectionsRef.current.size} peers`);
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
            console.log("[CharacterSync] Received character data:", {
              peerId: message.peerId,
              characterName: message.character.name,
              hasAvatar: !!message.character.avatar,
            });

            // If we're the host, initialize heartbeat tracking for this peer
            if (isHost) {
              console.log(`[CharacterSync] Initializing heartbeat tracking for ${message.peerId.slice(0, 8)}`);
              lastHeartbeatRef.current.set(message.peerId, Date.now());
            }

            let wasNewParticipant = false;

            setParticipants((prev) => {
              const updated = new Map(prev);
              const existing = updated.get(message.peerId);
              wasNewParticipant = !existing || existing.status === "pending";
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

            // Add system message for participant joining (if newly ready)
            if (wasNewParticipant && message.character) {
              const systemMsg: SystemMessageType = {
                type: "SystemMessage",
                id: crypto.randomUUID(),
                event: "joined",
                characterName: message.character.name,
                timestamp: Date.now(),
              };
              setChatHistory((prev) => {
                // Deduplicate
                if (prev.some((m) => m.id === systemMsg.id)) return prev;
                return [...prev, systemMsg];
              });
              // Broadcast to all peers
              broadcast(systemMsg);

              // If we're host, broadcast updated participant list to all peers
              if (isHost && myPeerId) {
                // Build participant list including all ready participants
                setParticipants((currentParticipants) => {
                  const participantList = Array.from(currentParticipants.values())
                    .filter((p) => p.status === "ready" && p.character !== null)
                    .map((p) => ({
                      peerId: p.peerId,
                      character: p.character!,
                      autoReplyEnabled: p.autoReplyEnabled,
                    }));

                  // Add ourselves (only name and avatar for privacy)
                  const myChar = myCharacterRef.current;
                  if (myChar && myPeerId) {
                    participantList.push({
                      peerId: myPeerId,
                      character: {
                        name: myChar.name,
                        avatar: myChar.avatar,
                      },
                      autoReplyEnabled: autoReplyEnabledRef.current,
                    });
                  }

                  // Broadcast participant list to all peers
                  broadcast({
                    type: "ParticipantList",
                    participants: participantList,
                  });

                  return currentParticipants; // Don't modify
                });
              }
            }
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

          case "Heartbeat": {
            // Host receives heartbeat from guest
            if (isHost) {
              console.log(`[Heartbeat] Received from peer ${message.peerId}`);
              lastHeartbeatRef.current.set(message.peerId, Date.now());
            }
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
            // Add system message for participant leaving
            if (message.characterName) {
              const systemMsg: SystemMessageType = {
                type: "SystemMessage",
                id: crypto.randomUUID(),
                event: "left",
                characterName: message.characterName,
                timestamp: Date.now(),
              };
              setChatHistory((prev) => {
                if (prev.some((m) => m.id === systemMsg.id)) return prev;
                return [...prev, systemMsg];
              });
            }
            handlePeerDisconnect(message.peerId);
            break;
          }

          case "SystemMessage": {
            // Receive system message broadcast (join/leave notifications)
            setChatHistory((prev) => {
              if (prev.some((m) => m.id === message.id)) return prev;
              return [...prev, message].sort((a, b) => a.timestamp - b.timestamp);
            });
            break;
          }

          case "ParticipantList": {
            // Receive participant list broadcast from host
            console.log("[ParticipantList] Received from host:", {
              participantCount: message.participants.length,
              participants: message.participants.map(p => ({
                peerId: p.peerId.slice(0, 8),
                characterName: p.character.name,
              })),
            });

            // Clear and rebuild participant list from host's authoritative list
            setParticipants((prev) => {
              const updated = new Map();

              message.participants.forEach((p) => {
                if (p.peerId !== myPeerId) {
                  const existing = prev.get(p.peerId);
                  updated.set(p.peerId, {
                    peerId: p.peerId,
                    status: "ready",
                    character: p.character,
                    connection: existing?.connection ?? connectionsRef.current.get(p.peerId) ?? null,
                    autoReplyEnabled: p.autoReplyEnabled,
                  });

                  // Connect to participant if not already connected
                  if (
                    peer &&
                    !connectionsRef.current.has(p.peerId) &&
                    !pendingConnectionsRef.current.has(p.peerId)
                  ) {
                    connectToPeer(p.peerId);
                  }
                }
              });

              console.log(`[ParticipantList] Updated participant list to ${updated.size} participants`);
              return updated;
            });
            break;
          }

          case "RequestSync": {
            // Send our character info to the requester (only name and avatar)
            if (myCharacter && myPeerId) {
              sendTo(message.peerId, {
                type: "CharacterSync",
                character: {
                  name: myCharacter.name,
                  avatar: myCharacter.avatar,
                },
                peerId: myPeerId,
              });
            }

            // If we're host, send session info
            if (isHost) {
              // Only include participants with characters (ready status)
              const participantList = Array.from(participantsRef.current.values())
                .filter((p) => p.status === "ready" && p.character !== null)
                .map((p) => ({
                  peerId: p.peerId,
                  character: p.character!,
                  autoReplyEnabled: p.autoReplyEnabled,
                }));

              // Add ourselves (only name and avatar for privacy)
              if (myCharacter && myPeerId) {
                participantList.push({
                  peerId: myPeerId,
                  character: {
                    name: myCharacter.name,
                    avatar: myCharacter.avatar,
                  },
                  autoReplyEnabled: autoReplyEnabledRef.current,
                });
              }

              // Filter to only chat messages for sync (exclude system messages)
              const chatMessagesOnly = chatHistoryRef.current
                .filter((m): m is ChatMessageType => m.type === "ChatMessage")
                .map(({ type, ...rest }) => rest);

              sendTo(message.peerId, {
                type: "SessionInfo",
                participants: participantList,
                chatHistory: chatMessagesOnly,
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
      onMessage,
      onParticipantJoined,
      onTyping,
      onThinking,
      sendTo,
      broadcast,
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

        // If we already have character, send CharacterSync too (only name and avatar)
        if (char && pid) {
          conn.send(
            JSON.stringify({
              type: "CharacterSync",
              character: {
                name: char.name,
                avatar: char.avatar,
              },
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

        // Send our character info using refs for latest values (only name and avatar)
        const char = myCharacterRef.current;
        const pid = myPeerIdRef.current;
        if (char && pid) {
          console.log("[CharacterSync] Host sending character data to new peer:", {
            peerId: pid,
            characterName: char.name,
            hasAvatar: !!char.avatar,
          });
          conn.send(
            JSON.stringify({
              type: "CharacterSync",
              character: {
                name: char.name,
                avatar: char.avatar,
              },
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
        // Get character name before disconnecting
        setParticipants((prev) => {
          const participant = prev.get(conn.peer);
          const characterName = participant?.character?.name;

          // Broadcast that peer left (with character name for system message)
          broadcast({
            type: "PeerLeft",
            peerId: conn.peer,
            characterName,
          });

          // Add system message for participant leaving
          if (characterName) {
            const systemMsg: SystemMessageType = {
              type: "SystemMessage",
              id: crypto.randomUUID(),
              event: "left",
              characterName,
              timestamp: Date.now(),
            };
            setChatHistory((prevHistory) => [...prevHistory, systemMsg]);
          }

          return prev;
        });

        handlePeerDisconnect(conn.peer);
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
    if (!isHost && myCharacter && myPeerId && hostPeerId && isConnected) {
      console.log("[CharacterSync] Sending character data:", {
        peerId: myPeerId,
        characterName: myCharacter.name,
        hasAvatar: !!myCharacter.avatar,
        isConnected,
      });
      // Send our character directly to the host (only name and avatar)
      sendTo(hostPeerId, {
        type: "CharacterSync",
        character: {
          name: myCharacter.name,
          avatar: myCharacter.avatar,
        },
        peerId: myPeerId,
      });
    }
  }, [isHost, myCharacter, myPeerId, hostPeerId, isConnected, sendTo]);

  // Guest: Send periodic heartbeats to host
  useEffect(() => {
    if (!isHost && myPeerId && hostPeerId && isConnected) {
      console.log("[Heartbeat] Starting heartbeat sender to", hostPeerId.slice(0, 8));

      const heartbeatInterval = setInterval(() => {
        const conn = connectionsRef.current.get(hostPeerId);
        if (conn?.open) {
          sendTo(hostPeerId, {
            type: "Heartbeat",
            peerId: myPeerId,
            timestamp: Date.now(),
          });
          console.log(`[Heartbeat] Sent to host ${hostPeerId.slice(0, 8)}`);
        } else {
          console.warn(`[Heartbeat] Connection to host not open`);
        }
      }, CONNECT_CONFIG.PEER_HEARTBEAT_INTERVAL);

      // Send initial heartbeat immediately
      const conn = connectionsRef.current.get(hostPeerId);
      if (conn?.open) {
        sendTo(hostPeerId, {
          type: "Heartbeat",
          peerId: myPeerId,
          timestamp: Date.now(),
        });
        console.log(`[Heartbeat] Sent initial heartbeat to host`);
      }

      return () => {
        console.log("[Heartbeat] Stopping heartbeat sender");
        clearInterval(heartbeatInterval);
      };
    }
  }, [isHost, myPeerId, hostPeerId, isConnected, sendTo]);

  // Host: Check for heartbeat timeouts and remove disconnected participants
  useEffect(() => {
    if (!isHost) return;

    console.log("[Heartbeat] Starting timeout checker");

    const timeoutChecker = setInterval(() => {
      const now = Date.now();
      const timedOutPeers: string[] = [];

      console.log(`[Heartbeat] Checking ${lastHeartbeatRef.current.size} peers for timeout`);
      lastHeartbeatRef.current.forEach((lastHeartbeat, peerId) => {
        const timeSinceLastHeartbeat = now - lastHeartbeat;
        const timeoutThreshold = CONNECT_CONFIG.PEER_HEARTBEAT_TIMEOUT;
        console.log(`[Heartbeat] Peer ${peerId.slice(0, 8)}: ${timeSinceLastHeartbeat}ms since last heartbeat (timeout at ${timeoutThreshold}ms)`);

        if (timeSinceLastHeartbeat > timeoutThreshold) {
          console.warn(`[Heartbeat] Peer ${peerId.slice(0, 8)} TIMED OUT (${timeSinceLastHeartbeat}ms > ${timeoutThreshold}ms)`);
          timedOutPeers.push(peerId);
        }
      });

      if (timedOutPeers.length > 0) {
        setParticipants((prev) => {
          const updated = new Map(prev);
          timedOutPeers.forEach((peerId) => {
            const participant = updated.get(peerId);
            if (participant?.character) {
              // Add system message for timeout
              const systemMsg: SystemMessageType = {
                type: "SystemMessage",
                id: crypto.randomUUID(),
                event: "left",
                characterName: participant.character.name,
                timestamp: Date.now(),
              };
              setChatHistory((prevHistory) => [...prevHistory, systemMsg]);

              // Broadcast leave message
              broadcast({
                type: "PeerLeft",
                peerId,
                characterName: participant.character.name,
              });
            }
            updated.delete(peerId);
            lastHeartbeatRef.current.delete(peerId);
            connectionsRef.current.get(peerId)?.close();
            connectionsRef.current.delete(peerId);
          });
          return updated;
        });

        // Broadcast updated participant list
        setParticipants((currentParticipants) => {
          const participantList = Array.from(currentParticipants.values())
            .filter((p) => p.status === "ready" && p.character !== null)
            .map((p) => ({
              peerId: p.peerId,
              character: p.character!,
              autoReplyEnabled: p.autoReplyEnabled,
            }));

          // Add ourselves (only name and avatar for privacy)
          const myChar = myCharacterRef.current;
          if (myChar && myPeerId) {
            participantList.push({
              peerId: myPeerId,
              character: {
                name: myChar.name,
                avatar: myChar.avatar,
              },
              autoReplyEnabled: autoReplyEnabledRef.current,
            });
          }

          broadcast({
            type: "ParticipantList",
            participants: participantList,
          });

          return currentParticipants;
        });
      }
    }, CONNECT_CONFIG.PEER_HEARTBEAT_INTERVAL);

    return () => {
      console.log("[Heartbeat] Stopping timeout checker");
      clearInterval(timeoutChecker);
    };
  }, [isHost, myPeerId, broadcast]);

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
      const char = myCharacterRef.current;
      broadcast({
        type: "PeerLeft",
        peerId: myPeerId,
        characterName: char?.name,
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

  // Memoize arrays to prevent unnecessary re-renders
  const participantsArray = useMemo(() => {
    const array = Array.from(participants.values());
    console.log("[useConnectPeers] Creating participants array:", array);
    array.forEach((p) => {
      console.log(`[useConnectPeers] Participant [${p.peerId.slice(0, 8)}]:`, {
        peerId: p.peerId,
        status: p.status,
        characterName: p.character?.name,
        hasCharacter: !!p.character,
      });
    });
    return array;
  }, [participants]);

  const thinkingPeersArray = useMemo(
    () => Array.from(thinkingPeers),
    [thinkingPeers]
  );

  return {
    participants: participantsArray,
    isConnected,
    autoReplyEnabled,
    chatHistory,
    thinkingPeers: thinkingPeersArray,
    sendChatMessage,
    sendTyping,
    sendThinking,
    toggleAutoReply,
    disconnectAll,
    connectToPeer,
  };
}
