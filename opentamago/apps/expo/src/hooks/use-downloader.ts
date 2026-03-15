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

  const connRef = useRef<DataConnection | null>(null);
  const chunksRef = useRef<string[]>([]);

  const channelQuery = useQuery(
    trpc.p2p.getChannel.queryOptions({ slug }, { enabled: !!slug })
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
        let expectingChunkData = false;
        let currentChunkFinal = false;

        conn.on("data", async (rawData) => {
          // If expecting binary chunk data (base64 string)
          if (expectingChunkData) {
            expectingChunkData = false;
            const base64Data = rawData as string;
            chunksRef.current.push(base64Data);

            // Estimate received bytes from base64 length
            receivedBytes += Math.floor((base64Data.length * 3) / 4);

            if (currentFile) {
              setProgress(
                Math.min(
                  99,
                  Math.round((receivedBytes / currentFile.size) * 100)
                )
              );
            }

            if (currentChunkFinal) {
              // All chunks received, save file
              setStatus("complete");
              setProgress(100);

              const fileUri = `${FileSystem.cacheDirectory}${currentFile?.name ?? "download"}`;
              const fullBase64 = chunksRef.current.join("");
              await FileSystem.writeAsStringAsync(fileUri, fullBase64, {
                encoding: FileSystem.EncodingType.Base64,
              });

              conn.send({ type: "Done" });

              // Open share sheet
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri);
              }
            } else {
              conn.send({ type: "ChunkAck", bytesReceived: receivedBytes });
            }
            return;
          }

          const data = rawData as ShareMessage;
          if (!data?.type) return;

          switch (data.type) {
            case "PasswordRequired": {
              setStatus("authenticating");
              if (password) {
                const { computeChallengeResponse } = await import(
                  "@acme/p2p/core"
                );
                const response = await computeChallengeResponse(
                  password,
                  data.challenge
                );
                conn.send({ type: "UsePassword", response });
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
              expectingChunkData = true;
              currentChunkFinal = data.final;
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
  };
}
