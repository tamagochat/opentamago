"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { DataConnection } from "peerjs";
import { browserName, osName } from "react-device-detect";
import { decodeMessage, P2P_CONFIG, computeChallengeResponse } from "~/lib/p2p";
import type { InfoMessage } from "~/lib/p2p";

export type DownloadState =
  | "connecting"
  | "password-required"
  | "password-error"
  | "ready"
  | "downloading"
  | "complete"
  | "error";

interface UseDownloaderOptions {
  peer: import("peerjs").default | null;
  uploaderPeerId: string;
}

export function useDownloader({ peer, uploaderPeerId }: UseDownloaderOptions) {
  const [state, setState] = useState<DownloadState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<InfoMessage["file"] | null>(null);
  const [bytesDownloaded, setBytesDownloaded] = useState(0);
  const [downloadedBlob, setDownloadedBlob] = useState<Blob | null>(null);

  const connectionRef = useRef<DataConnection | null>(null);
  const chunksRef = useRef<ArrayBuffer[]>([]);
  const fileInfoRef = useRef<InfoMessage["file"] | null>(null);
  const stateRef = useRef<DownloadState>("connecting");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalReceivedRef = useRef(false);
  // Store challenge for password authentication
  const challengeRef = useRef<string | null>(null);

  // Reset stall timeout during active download
  const resetStallTimeout = useCallback(() => {
    if (stallTimeoutRef.current) {
      clearTimeout(stallTimeoutRef.current);
    }
    if (stateRef.current === "downloading") {
      stallTimeoutRef.current = setTimeout(() => {
        if (stateRef.current === "downloading") {
          console.log("[P2P] Transfer stalled");
          setError("Transfer stalled - no data received");
          setState("error");
          connectionRef.current?.close();
        }
      }, P2P_CONFIG.STALL_TIMEOUT);
    }
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    fileInfoRef.current = fileInfo;
  }, [fileInfo]);

  const triggerDownload = useCallback(() => {
    const info = fileInfoRef.current;
    if (!info || chunksRef.current.length === 0) return;

    // Combine all chunks
    const blob = new Blob(chunksRef.current, {
      type: info.type || "application/octet-stream",
    });

    // Store blob for potential reuse (e.g., saving to database)
    setDownloadedBlob(blob);

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = info.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Notify uploader
    connectionRef.current?.send({ type: "Done" });
    setState("complete");
  }, []);

  const connect = useCallback(() => {
    if (!peer || !uploaderPeerId) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState("connecting");
    stateRef.current = "connecting";
    setError(null);

    console.log("[P2P] Connecting to peer:", uploaderPeerId);

    const conn = peer.connect(uploaderPeerId, {
      reliable: true,
    });

    connectionRef.current = conn;

    conn.on("open", () => {
      console.log("[P2P] Connection opened");
      // Clear timeout on successful connection
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Send request info
      conn.send({
        type: "RequestInfo",
        browserName,
        osName,
      });
    });

    conn.on("data", (data) => {
      // Clear timeout on receiving data
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Handle binary data (file chunks)
      // PeerJS may deliver binary data as ArrayBuffer or typed arrays (Uint8Array, etc.)
      let buffer: ArrayBuffer | null = null;
      if (data instanceof ArrayBuffer) {
        buffer = data;
      } else if (data instanceof Uint8Array) {
        // Handle typed arrays - convert to ArrayBuffer
        buffer = data.buffer.slice(
          data.byteOffset,
          data.byteOffset + data.byteLength
        ) as ArrayBuffer;
      }

      if (buffer) {
        // Reset stall timeout on each chunk received
        resetStallTimeout();

        chunksRef.current.push(buffer);
        const totalBytes = chunksRef.current.reduce(
          (sum, c) => sum + c.byteLength,
          0
        );
        setBytesDownloaded(totalBytes);

        // Send acknowledgment
        conn.send({
          type: "ChunkAck",
          bytesReceived: totalBytes,
        });

        // Check if we've received all data after final flag was set
        const expected = fileInfoRef.current?.size ?? 0;
        if (finalReceivedRef.current && totalBytes >= expected) {
          // Clear stall timeout on complete
          if (stallTimeoutRef.current) {
            clearTimeout(stallTimeoutRef.current);
            stallTimeoutRef.current = null;
          }
          triggerDownload();
        }
        return;
      }

      const message = decodeMessage(data);
      if (!message) {
        console.log("[P2P] Unknown message:", data);
        return;
      }

      console.log("[P2P] Received message:", message.type);

      switch (message.type) {
        case "PasswordRequired":
          // Store challenge for computing response
          challengeRef.current = message.challenge;
          if (message.error) {
            setState("password-error");
          } else {
            setState("password-required");
          }
          break;

        case "Info":
          setFileInfo(message.file);
          fileInfoRef.current = message.file;
          setState("ready");
          break;

        case "Chunk":
          if (message.final) {
            finalReceivedRef.current = true;
            // Verify all bytes received before downloading
            const totalBytes = chunksRef.current.reduce(
              (sum, c) => sum + c.byteLength,
              0
            );
            const expected = fileInfoRef.current?.size ?? 0;
            if (totalBytes >= expected) {
              triggerDownload();
            } else {
              console.log(
                `[P2P] Final flag received, waiting for remaining data: ${totalBytes}/${expected}`
              );
            }
          }
          break;

        case "Error":
          setError(message.message);
          setState("error");
          break;
      }
    });

    conn.on("close", () => {
      console.log("[P2P] Connection closed");
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Use ref to check current state (avoid stale closure)
      if (stateRef.current !== "complete") {
        setError("Connection closed by uploader");
        setState("error");
      }
    });

    conn.on("error", (err) => {
      console.error("[P2P] Connection error:", err);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setError(err.message || "Connection failed");
      setState("error");
    });

    // Connection timeout - use ref to check state
    timeoutRef.current = setTimeout(() => {
      console.log("[P2P] Timeout check, state:", stateRef.current);
      if (stateRef.current === "connecting") {
        conn.close();
        setError("Connection timeout");
        setState("error");
      }
    }, P2P_CONFIG.CONNECTION_TIMEOUT);
  }, [peer, uploaderPeerId, triggerDownload]);

  const submitPassword = useCallback(async (password: string) => {
    if (!connectionRef.current || !challengeRef.current) return;

    // Compute hash response using password + challenge
    const response = await computeChallengeResponse(
      password,
      challengeRef.current
    );

    connectionRef.current.send({
      type: "UsePassword",
      response,
    });
  }, []);

  const startDownload = useCallback(() => {
    if (!connectionRef.current) return;
    setState("downloading");
    chunksRef.current = [];
    finalReceivedRef.current = false;
    setBytesDownloaded(0);

    // Start stall timeout
    resetStallTimeout();

    connectionRef.current.send({
      type: "Start",
      offset: 0,
    });
  }, [resetStallTimeout]);

  // Auto-connect when peer is ready
  useEffect(() => {
    if (peer && uploaderPeerId) {
      connect();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (stallTimeoutRef.current) {
        clearTimeout(stallTimeoutRef.current);
        stallTimeoutRef.current = null;
      }
      connectionRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer, uploaderPeerId]);

  const progress = fileInfo ? (bytesDownloaded / fileInfo.size) * 100 : 0;

  return {
    state,
    error,
    fileInfo,
    bytesDownloaded,
    progress,
    downloadedBlob,
    submitPassword,
    startDownload,
    reconnect: connect,
  };
}
