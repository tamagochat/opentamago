"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DataConnection } from "peerjs";
import {
  P2P_CONFIG,
  decodeMessage,
  generateChallenge,
  computeChallengeResponse,
} from "~/lib/p2p";
import type { Message } from "~/lib/p2p";

export type ConnectionStatus =
  | "pending"
  | "authenticating"
  | "ready"
  | "uploading"
  | "paused"
  | "done"
  | "error"
  | "closed";

export interface UploaderConnection {
  id: string;
  connection: DataConnection;
  status: ConnectionStatus;
  browserName?: string;
  osName?: string;
  bytesAcknowledged: number;
  error?: string;
}

interface UseUploaderConnectionsOptions {
  peer: import("peerjs").default | null;
  file: File | null;
  password?: string;
}

export function useUploaderConnections({
  peer,
  file,
  password,
}: UseUploaderConnectionsOptions) {
  const [connections, setConnections] = useState<Map<string, UploaderConnection>>(
    new Map()
  );
  const [totalDownloads, setTotalDownloads] = useState(0);
  const activeTransfers = useRef<Map<string, boolean>>(new Map());
  // Store challenges per connection for password verification
  const connectionChallenges = useRef<Map<string, string>>(new Map());

  const updateConnection = useCallback(
    (id: string, updates: Partial<UploaderConnection>) => {
      setConnections((prev) => {
        const conn = prev.get(id);
        if (!conn) return prev;
        const next = new Map(prev);
        next.set(id, { ...conn, ...updates });
        return next;
      });
    },
    []
  );

  const sendChunks = useCallback(
    (conn: DataConnection, connId: string, offset: number = 0) => {
      if (!file) return;

      activeTransfers.current.set(connId, true);
      updateConnection(connId, { status: "uploading" });

      let currentOffset = offset;
      let sendTimeout: NodeJS.Timeout | null = null;

      const sendNextChunk = () => {
        // Use setTimeout(0) to yield to event loop (like FilePizza)
        sendTimeout = setTimeout(() => {
          if (!activeTransfers.current.get(connId)) return;

          const chunk = file.slice(
            currentOffset,
            currentOffset + P2P_CONFIG.MAX_CHUNK_SIZE
          );
          const isFinal = currentOffset + chunk.size >= file.size;

          chunk.arrayBuffer().then((buffer) => {
            if (!activeTransfers.current.get(connId)) return;

            // Send binary data first
            conn.send(buffer);
            // Then send metadata (so downloader has data before seeing final=true)
            conn.send({
              type: "Chunk",
              offset: currentOffset,
              final: isFinal,
            });

            currentOffset += chunk.size;
            updateConnection(connId, { bytesAcknowledged: currentOffset });

            if (!isFinal && activeTransfers.current.get(connId)) {
              // Continue with next chunk - yield to event loop
              sendNextChunk();
            }
          });
        }, 0);
      };

      sendNextChunk();

      // Return cleanup function
      return () => {
        if (sendTimeout) {
          clearTimeout(sendTimeout);
        }
      };
    },
    [file, updateConnection]
  );

  const handleMessage = useCallback(
    (conn: DataConnection, connId: string, data: unknown) => {
      const message = decodeMessage(data);
      if (!message) return;

      switch (message.type) {
        case "RequestInfo":
          updateConnection(connId, {
            browserName: message.browserName,
            osName: message.osName,
            status: password ? "authenticating" : "ready",
          });

          if (password) {
            // Generate and store challenge for this connection
            const challenge = generateChallenge();
            connectionChallenges.current.set(connId, challenge);
            conn.send({ type: "PasswordRequired", challenge });
          } else if (file) {
            conn.send({
              type: "Info",
              file: {
                name: file.name,
                size: file.size,
                type: file.type,
              },
            });
          }
          break;

        case "UsePassword":
          {
            // Verify challenge-response
            const challenge = connectionChallenges.current.get(connId);
            if (!challenge || !password) {
              conn.send({
                type: "PasswordRequired",
                challenge: generateChallenge(),
                error: "Authentication error",
              });
              break;
            }

            // Compute expected response and compare
            computeChallengeResponse(password, challenge).then(
              (expectedResponse) => {
                if (message.response === expectedResponse) {
                  // Clear challenge after successful auth
                  connectionChallenges.current.delete(connId);
                  updateConnection(connId, { status: "ready" });
                  if (file) {
                    conn.send({
                      type: "Info",
                      file: {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                      },
                    });
                  }
                } else {
                  // Generate new challenge for retry
                  const newChallenge = generateChallenge();
                  connectionChallenges.current.set(connId, newChallenge);
                  conn.send({
                    type: "PasswordRequired",
                    challenge: newChallenge,
                    error: "Invalid password",
                  });
                }
              }
            );
          }
          break;

        case "Start":
          sendChunks(conn, connId, message.offset);
          break;

        case "ChunkAck":
          updateConnection(connId, { bytesAcknowledged: message.bytesReceived });
          break;

        case "Pause":
          activeTransfers.current.set(connId, false);
          updateConnection(connId, { status: "paused" });
          break;

        case "Done":
          activeTransfers.current.set(connId, false);
          updateConnection(connId, { status: "done" });
          setTotalDownloads((prev) => prev + 1);
          break;

        case "Error":
          activeTransfers.current.set(connId, false);
          updateConnection(connId, { status: "error", error: message.message });
          break;
      }
    },
    [file, password, updateConnection, sendChunks]
  );

  useEffect(() => {
    if (!peer) return;

    const handleConnection = (conn: DataConnection) => {
      const connId = conn.connectionId;

      setConnections((prev) => {
        const next = new Map(prev);
        next.set(connId, {
          id: connId,
          connection: conn,
          status: "pending",
          bytesAcknowledged: 0,
        });
        return next;
      });

      conn.on("data", (data) => {
        handleMessage(conn, connId, data);
      });

      conn.on("close", () => {
        activeTransfers.current.delete(connId);
        updateConnection(connId, { status: "closed" });
      });

      conn.on("error", (err) => {
        activeTransfers.current.delete(connId);
        updateConnection(connId, { status: "error", error: err.message });
      });
    };

    peer.on("connection", handleConnection);

    return () => {
      peer.off("connection", handleConnection);
    };
  }, [peer, handleMessage, updateConnection]);

  const activeCount = Array.from(connections.values()).filter(
    (c) => c.status === "uploading" || c.status === "ready"
  ).length;

  return {
    connections: Array.from(connections.values()),
    activeCount,
    totalDownloads,
  };
}
