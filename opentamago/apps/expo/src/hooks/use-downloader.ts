import { useCallback, useRef, useState } from "react";
import type { DataConnection } from "peerjs";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useQuery } from "@tanstack/react-query";

import type { ShareMessage } from "@acme/p2p/messages";

import { trpc } from "~/utils/api";

export type DownloadStatus =
  | "idle"
  | "connecting"
  | "authenticating"
  | "invalid-password"
  | "downloading"
  | "complete"
  | "error";

export function useDownloader(slug: string) {
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);

  const connRef = useRef<DataConnection | null>(null);
  const chunksRef = useRef<string[]>([]);
  // Store the latest challenge so retryPassword can respond to it
  const pendingChallengeRef = useRef<string | null>(null);

  const channelQuery = useQuery(
    trpc.p2p.getChannel.queryOptions({ slug }, { enabled: !!slug })
  );

  // Reset all state when slug is cleared
  const prevSlugRef = useRef(slug);
  if (slug === "" && prevSlugRef.current !== "") {
    setStatus("idle");
    setProgress(0);
    setError(null);
    setFileInfo(null);
    setDownloadedFileUri(null);
    chunksRef.current = [];
    connRef.current?.close();
    connRef.current = null;
    pendingChallengeRef.current = null;
  }
  prevSlugRef.current = slug;

  // Retry with a new password over the existing connection
  const retryPassword = useCallback(
    async (newPassword: string) => {
      const conn = connRef.current;
      const challenge = pendingChallengeRef.current;
      if (!conn || !challenge) return;

      setStatus("authenticating");
      setError(null);

      const { computeChallengeResponse } = await import("@acme/p2p/core");
      const response = computeChallengeResponse(newPassword, challenge);
      conn.send({ type: "UsePassword", response });
    },
    []
  );

  const connect = useCallback(
    async (password?: string) => {
      if (!channelQuery.data) return;

      setStatus("connecting");
      setError(null);

      try {
        const { createPeer, waitForPeerOpen } = await import("@acme/p2p/core");

        const configQuery = channelQuery.data;
        const peer = createPeer();
        await waitForPeerOpen(peer);

        const conn = peer.connect(configQuery.uploaderPeerId, {
          reliable: true,
        });

        connRef.current = conn;

        conn.on("open", () => {
          conn.send({
            type: "RequestInfo",
            osName: "React Native",
          });
        });

        let currentFile: { name: string; size: number; type: string } | null =
          null;
        let receivedBytes = 0;

        // Handles both chunk orderings:
        // - Next.js uploader: sends binary ArrayBuffer first, then Chunk metadata
        // - Expo uploader: sends Chunk metadata first, then base64 string
        // We buffer whichever arrives first and process when both are available.
        let pendingChunkData: unknown = null;
        let pendingChunkMeta: { final: boolean } | null = null;

        const processChunk = async (
          chunkData: unknown,
          isFinal: boolean,
        ) => {
          let base64Data: string;

          if (chunkData instanceof ArrayBuffer) {
            // Web browser ArrayBuffer
            const bytes = new Uint8Array(chunkData);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]!);
            }
            base64Data = btoa(binary);
            receivedBytes += bytes.length;
          } else if (
            ArrayBuffer.isView(chunkData) ||
            (typeof chunkData === "object" &&
              chunkData !== null &&
              "byteLength" in chunkData)
          ) {
            // Uint8Array or ArrayBuffer-like from react-native-webrtc
            const bytes =
              chunkData instanceof Uint8Array
                ? chunkData
                : new Uint8Array(
                    (chunkData as ArrayBufferLike).byteLength
                      ? (chunkData as ArrayBuffer)
                      : Object.values(chunkData as Record<string, number>),
                  );
            let binary = "";
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]!);
            }
            base64Data = btoa(binary);
            receivedBytes += bytes.length;
          } else {
            // Base64 string from Expo uploader
            base64Data = chunkData as string;
            receivedBytes += Math.floor((base64Data.length * 3) / 4);
          }

          chunksRef.current.push(base64Data);

          if (currentFile) {
            setProgress(
              Math.min(
                99,
                Math.round((receivedBytes / currentFile.size) * 100),
              ),
            );
          }

          if (isFinal) {
            setStatus("complete");
            setProgress(100);

            const fileUri = `${FileSystem.cacheDirectory}${currentFile?.name ?? "download"}`;
            const fullBase64 = chunksRef.current.join("");
            await FileSystem.writeAsStringAsync(fileUri, fullBase64, {
              encoding: FileSystem.EncodingType.Base64,
            });
            setDownloadedFileUri(fileUri);

            conn.send({ type: "Done" });

            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(fileUri);
            }
          } else {
            conn.send({ type: "ChunkAck", bytesReceived: receivedBytes });
          }
        };

        const tryProcessPendingChunk = async () => {
          if (pendingChunkData !== null && pendingChunkMeta !== null) {
            const data = pendingChunkData;
            const meta = pendingChunkMeta;
            pendingChunkData = null;
            pendingChunkMeta = null;
            await processChunk(data, meta.final);
          }
        };

        conn.on("data", async (rawData) => {
          // Determine if this is a structured P2P message (has a string "type" field)
          // vs raw chunk data (ArrayBuffer, Uint8Array, or base64 string)
          const isMessage =
            typeof rawData === "object" &&
            rawData !== null &&
            !ArrayBuffer.isView(rawData) &&
            !(rawData instanceof ArrayBuffer) &&
            typeof (rawData as Record<string, unknown>).type === "string";

          if (!isMessage) {
            // Raw chunk data (binary object or base64 string)
            pendingChunkData = rawData;
            await tryProcessPendingChunk();
            return;
          }

          const data = rawData as ShareMessage;

          switch (data.type) {
            case "PasswordRequired": {
              pendingChallengeRef.current = data.challenge;

              if (data.error) {
                setStatus("invalid-password");
                setError(data.error);
              } else if (password) {
                setStatus("authenticating");
                const { computeChallengeResponse } = await import(
                  "@acme/p2p/core"
                );
                const response = computeChallengeResponse(
                  password,
                  data.challenge,
                );
                conn.send({ type: "UsePassword", response });
              } else {
                setStatus("invalid-password");
                setError("Password required");
              }
              break;
            }

            case "Info": {
              currentFile = data.file;
              setFileInfo(data.file);
              setStatus("downloading");
              receivedBytes = 0;
              chunksRef.current = [];
              conn.send({ type: "Start", offset: 0 });
              break;
            }

            case "Chunk": {
              pendingChunkMeta = { final: data.final };
              await tryProcessPendingChunk();
              break;
            }

            case "Error": {
              setStatus("error");
              setError(data.message);
              break;
            }
          }
        });

        conn.on("close", () => {
          if (status !== "complete") {
            setStatus("error");
            setError("Connection closed");
          }
        });

        conn.on("error", (err) => {
          setStatus("error");
          setError(err.message);
        });
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Failed to connect"
        );
      }
    },
    [channelQuery.data, status]
  );

  return {
    channel: channelQuery.data,
    isLoadingChannel: channelQuery.isLoading,
    status,
    progress,
    error,
    fileInfo,
    connect,
    retryPassword,
    downloadedFileUri,
  };
}
