"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { DataConnection, Peer } from "peerjs";
import { useWebRTCPeer } from "./webrtc-provider";
import {
  ConnectMessage,
  type ConnectMessageType,
  type CharacterData,
  type ChatMessageType,
  type SystemMessageType,
  type ParticipantStatus,
} from "~/lib/connect/messages";
import type { Participant, ChatItemType } from "~/app/_components/connect/hooks/use-connect-peers";
import {
  setSession,
  clearSession,
  addConnection,
  removeConnection,
  getConnection,
  setParticipants,
  addParticipant,
  updateParticipant,
  removeParticipant,
  bufferMessage,
  clearBufferedMessages,
  getBufferedMessages,
  addThinkingPeer,
  removeThinkingPeer,
  getState,
  type ConnectSessionInfo,
} from "~/lib/stores/connect-store";

// Singleton manager instance
let globalManager: ConnectManager | null = null;

// Manager class that handles connection lifecycle
class ConnectManager {
  private peer: Peer | null = null;
  private connectionListeners = new Map<string, () => void>();
  private pendingConnections = new Set<string>();

  constructor(peer: Peer) {
    this.peer = peer;
    this.setupPeerListeners();
  }

  private setupPeerListeners() {
    if (!this.peer) return;

    // Listen for incoming connections
    this.peer.on("connection", (conn) => {
      console.log("[ConnectManager] Incoming connection from:", conn.peer);
      this.handleIncomingConnection(conn);
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    const peerId = conn.peer;

    // Add connection to store
    addConnection(peerId, conn);

    // Add participant as connecting
    addParticipant(peerId, {
      peerId,
      status: "connecting",
      character: null,
      connection: conn,
      autoReplyEnabled: true,
    });

    // Setup event listeners
    this.setupConnectionListeners(conn);
  }

  private setupConnectionListeners(conn: DataConnection) {
    const peerId = conn.peer;

    conn.on("open", () => {
      console.log("[ConnectManager] Connection opened:", peerId);
      this.pendingConnections.delete(peerId);

      // Update participant status
      updateParticipant(peerId, { status: "pending" });

      // Send our character data if we have one
      const state = getState();
      if (state.sessionInfo?.myCharacter && state.sessionInfo.myPeerId) {
        this.sendTo(peerId, {
          type: "CharacterSync",
          character: state.sessionInfo.myCharacter,
          peerId: state.sessionInfo.myPeerId,
        });
      }
    });

    conn.on("data", (data) => {
      this.handleIncomingMessage(data, peerId);
    });

    conn.on("close", () => {
      console.log("[ConnectManager] Connection closed:", peerId);
      this.handlePeerDisconnect(peerId);
    });

    conn.on("error", (error) => {
      console.error("[ConnectManager] Connection error:", peerId, error);
      this.handlePeerDisconnect(peerId);
    });

    // Store cleanup function
    const cleanup = () => {
      conn.off("open");
      conn.off("data");
      conn.off("close");
      conn.off("error");
    };
    this.connectionListeners.set(peerId, cleanup);
  }

  private handleIncomingMessage(data: unknown, fromPeerId: string) {
    try {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      const result = ConnectMessage.safeParse(parsed);

      if (!result.success) {
        console.warn("[ConnectManager] Invalid message:", result.error);
        return;
      }

      const message = result.data;
      const state = getState();

      switch (message.type) {
        case "PeerConnecting": {
          addParticipant(message.peerId, {
            peerId: message.peerId,
            status: "pending",
            character: null,
            connection: getConnection(message.peerId) ?? null,
            autoReplyEnabled: true,
          });
          break;
        }

        case "CharacterSync": {
          const existing = state.participants.get(message.peerId);
          const wasNewParticipant =
            !existing || existing.status === "pending";

          updateParticipant(message.peerId, {
            status: "ready",
            character: message.character,
          });

          // Add system message for new participant
          if (wasNewParticipant && message.character) {
            const systemMsg: SystemMessageType = {
              type: "SystemMessage",
              id: crypto.randomUUID(),
              event: "joined",
              characterName: message.character.name,
              timestamp: Date.now(),
            };
            this.handleChatItem(systemMsg);

            // If we're host, broadcast updated participant list
            if (state.sessionInfo?.isHost) {
              this.broadcastParticipantList();
            }
          }
          break;
        }

        case "ChatMessage": {
          this.handleChatItem(message as ChatMessageType);
          break;
        }

        case "Typing": {
          // Typing indicators are transient, don't buffer
          break;
        }

        case "Thinking": {
          if (message.isThinking) {
            addThinkingPeer(message.peerId);
          } else {
            removeThinkingPeer(message.peerId);
          }
          break;
        }

        case "PeerState": {
          updateParticipant(message.peerId, {
            autoReplyEnabled: message.autoReplyEnabled,
          });
          break;
        }

        case "PeerJoined": {
          // Connect to new peer if not already connected
          if (
            this.peer &&
            message.peerId !== state.sessionInfo?.myPeerId &&
            !getConnection(message.peerId) &&
            !this.pendingConnections.has(message.peerId)
          ) {
            this.connectToPeer(message.peerId);
          }
          break;
        }

        case "PeerLeft": {
          if (message.characterName) {
            const systemMsg: SystemMessageType = {
              type: "SystemMessage",
              id: crypto.randomUUID(),
              event: "left",
              characterName: message.characterName,
              timestamp: Date.now(),
            };
            this.handleChatItem(systemMsg);
          }
          this.handlePeerDisconnect(message.peerId);
          break;
        }

        case "SystemMessage": {
          this.handleChatItem(message);
          break;
        }

        case "ParticipantList": {
          message.participants.forEach((p) => {
            if (p.peerId !== state.sessionInfo?.myPeerId) {
              const existing = state.participants.get(p.peerId);
              if (!existing || existing.status !== "ready") {
                addParticipant(p.peerId, {
                  peerId: p.peerId,
                  status: "ready",
                  character: p.character,
                  connection: getConnection(p.peerId) ?? null,
                  autoReplyEnabled: p.autoReplyEnabled,
                });
              }

              // Connect if not already connected
              if (
                this.peer &&
                !getConnection(p.peerId) &&
                !this.pendingConnections.has(p.peerId)
              ) {
                this.connectToPeer(p.peerId);
              }
            }
          });
          break;
        }

        case "RequestSync": {
          // Send our character info
          if (state.sessionInfo?.myCharacter && state.sessionInfo.myPeerId) {
            this.sendTo(message.peerId, {
              type: "CharacterSync",
              character: state.sessionInfo.myCharacter,
              peerId: state.sessionInfo.myPeerId,
            });
          }

          // If we're host, send session info
          if (state.sessionInfo?.isHost) {
            const participantList = Array.from(state.participants.values())
              .filter((p) => p.status === "ready" && p.character !== null)
              .map((p) => ({
                peerId: p.peerId,
                character: p.character!,
                autoReplyEnabled: p.autoReplyEnabled,
              }));

            // Add ourselves
            if (state.sessionInfo.myCharacter && state.sessionInfo.myPeerId) {
              participantList.push({
                peerId: state.sessionInfo.myPeerId,
                character: state.sessionInfo.myCharacter,
                autoReplyEnabled: true,
              });
            }

            // Get buffered messages as chat history
            const chatMessagesOnly = state.bufferedMessages
              .filter((m): m is ChatMessageType => m.type === "ChatMessage")
              .map(({ type, ...rest }) => rest as any);

            this.sendTo(message.peerId, {
              type: "SessionInfo",
              participants: participantList,
              chatHistory: chatMessagesOnly,
            });
          }
          break;
        }

        case "SessionInfo": {
          message.participants.forEach((p) => {
            if (p.peerId !== state.sessionInfo?.myPeerId) {
              addParticipant(p.peerId, {
                peerId: p.peerId,
                status: "ready",
                character: p.character,
                connection: getConnection(p.peerId) ?? null,
                autoReplyEnabled: p.autoReplyEnabled,
              });

              // Connect if not already connected
              if (
                this.peer &&
                !getConnection(p.peerId) &&
                !this.pendingConnections.has(p.peerId)
              ) {
                this.connectToPeer(p.peerId);
              }
            }
          });

          // Sync chat history
          message.chatHistory.forEach((msg: any) => {
            const chatMsg: ChatMessageType = {
              type: "ChatMessage",
              ...msg,
            };
            this.handleChatItem(chatMsg);
          });
          break;
        }
      }
    } catch (error) {
      console.error("[ConnectManager] Error handling message:", error);
    }
  }

  private handleChatItem(item: ChatItemType) {
    // If component is attached, just buffer the message (component will handle it)
    // If component is detached, buffer for later
    bufferMessage(item);
  }

  private handlePeerDisconnect(peerId: string) {
    // Remove connection
    const conn = getConnection(peerId);
    if (conn) {
      try {
        conn.close();
      } catch (error) {
        console.error("[ConnectManager] Error closing connection:", error);
      }
    }
    removeConnection(peerId);

    // Cleanup listeners
    const cleanup = this.connectionListeners.get(peerId);
    if (cleanup) {
      cleanup();
      this.connectionListeners.delete(peerId);
    }

    // Update participant status
    updateParticipant(peerId, { status: "disconnected" });

    // Remove from pending
    this.pendingConnections.delete(peerId);
  }

  private broadcastParticipantList() {
    const state = getState();
    const participantList = Array.from(state.participants.values())
      .filter((p) => p.status === "ready" && p.character !== null)
      .map((p) => ({
        peerId: p.peerId,
        character: p.character!,
        autoReplyEnabled: p.autoReplyEnabled,
      }));

    // Add ourselves
    if (state.sessionInfo?.myCharacter && state.sessionInfo.myPeerId) {
      participantList.push({
        peerId: state.sessionInfo.myPeerId,
        character: state.sessionInfo.myCharacter,
        autoReplyEnabled: true,
      });
    }

    this.broadcast({
      type: "ParticipantList",
      participants: participantList,
    });
  }

  // Public API
  public connectToPeer(peerId: string) {
    if (!this.peer || this.pendingConnections.has(peerId)) return;

    this.pendingConnections.add(peerId);
    const conn = this.peer.connect(peerId, { reliable: true });

    addConnection(peerId, conn);
    addParticipant(peerId, {
      peerId,
      status: "connecting",
      character: null,
      connection: conn,
      autoReplyEnabled: true,
    });

    this.setupConnectionListeners(conn);

    // Timeout after 30 seconds
    setTimeout(() => {
      if (this.pendingConnections.has(peerId)) {
        console.warn("[ConnectManager] Connection timeout:", peerId);
        this.handlePeerDisconnect(peerId);
      }
    }, 30000);
  }

  public broadcast(message: ConnectMessageType) {
    const data = JSON.stringify(message);
    const connections = getState().activeConnections;
    connections.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  public sendTo(peerId: string, message: ConnectMessageType) {
    const conn = getConnection(peerId);
    if (conn?.open) {
      conn.send(JSON.stringify(message));
    }
  }

  public disconnectAll() {
    const state = getState();

    // Send PeerLeft message
    if (state.sessionInfo?.myPeerId && state.sessionInfo.myCharacter) {
      this.broadcast({
        type: "PeerLeft",
        peerId: state.sessionInfo.myPeerId,
        characterName: state.sessionInfo.myCharacter.name,
      });
    }

    // Close all connections
    state.activeConnections.forEach((conn) => {
      try {
        conn.close();
      } catch (error) {
        console.error("[ConnectManager] Error closing connection:", error);
      }
    });

    // Cleanup listeners
    this.connectionListeners.forEach((cleanup) => cleanup());
    this.connectionListeners.clear();
    this.pendingConnections.clear();

    // Clear store
    clearSession();
  }

  public initializeSession(sessionInfo: ConnectSessionInfo) {
    setSession(sessionInfo);
  }

  public getBufferedMessages(): ChatItemType[] {
    return getBufferedMessages();
  }

  public clearBufferedMessages() {
    clearBufferedMessages();
  }
}

// Context
interface ConnectManagerContextValue {
  manager: ConnectManager | null;
}

const ConnectManagerContext = createContext<ConnectManagerContextValue>({
  manager: null,
});

export function ConnectManagerProvider({ children }: { children: ReactNode }) {
  const { peer } = useWebRTCPeer();
  const managerRef = useRef<ConnectManager | null>(globalManager);

  useEffect(() => {
    if (!peer) return;

    // Initialize manager once
    if (!globalManager) {
      console.log("[ConnectManager] Initializing global manager");
      globalManager = new ConnectManager(peer);
      managerRef.current = globalManager;
    }

    // Cleanup is intentionally omitted - manager lives for the app lifetime
  }, [peer]);

  return (
    <ConnectManagerContext.Provider value={{ manager: managerRef.current }}>
      {children}
    </ConnectManagerContext.Provider>
  );
}

export function useConnectManager() {
  return useContext(ConnectManagerContext);
}
