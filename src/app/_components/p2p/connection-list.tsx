"use client";

import { Monitor, Smartphone, Loader2, Check, X, Pause } from "lucide-react";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import type { UploaderConnection, ConnectionStatus } from "./use-uploader-connections";

interface ConnectionListProps {
  connections: UploaderConnection[];
  fileSize: number;
  activeCount: number;
  totalDownloads: number;
}

function getStatusIcon(status: ConnectionStatus) {
  switch (status) {
    case "pending":
    case "authenticating":
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case "ready":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "uploading":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "paused":
      return <Pause className="h-4 w-4 text-yellow-500" />;
    case "done":
      return <Check className="h-4 w-4 text-green-500" />;
    case "error":
    case "closed":
      return <X className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}

function getStatusText(status: ConnectionStatus) {
  switch (status) {
    case "pending":
      return "Connecting...";
    case "authenticating":
      return "Waiting for password";
    case "ready":
      return "Ready to download";
    case "uploading":
      return "Downloading...";
    case "paused":
      return "Paused";
    case "done":
      return "Complete";
    case "error":
      return "Error";
    case "closed":
      return "Disconnected";
    default:
      return status;
  }
}

export function ConnectionList({
  connections,
  fileSize,
  activeCount,
  totalDownloads,
}: ConnectionListProps) {
  const activeConnections = connections.filter(
    (c) => c.status !== "closed" && c.status !== "error"
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm font-medium">
          {activeCount} Downloading, {totalDownloads} Total
        </p>
        <Button variant="link" size="sm" className="text-orange-500">
          Stop Upload
        </Button>
      </div>

      {/* Connection Items */}
      {activeConnections.length > 0 && (
        <div className="space-y-3">
          {activeConnections.map((conn) => {
            const progress =
              fileSize > 0 ? (conn.bytesAcknowledged / fileSize) * 100 : 0;

            return (
              <Card
                key={conn.id}
                className="flex items-center gap-3 bg-muted/30 p-3"
              >
                {/* Device Icon */}
                <div className="text-muted-foreground">
                  {conn.browserName?.toLowerCase().includes("mobile") ? (
                    <Smartphone className="h-5 w-5" />
                  ) : (
                    <Monitor className="h-5 w-5" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {conn.browserName || "Unknown Browser"}
                      {conn.osName && ` on ${conn.osName}`}
                    </span>
                  </div>

                  {conn.status === "uploading" && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusIcon(conn.status)}
                  <span className="text-xs text-muted-foreground">
                    {getStatusText(conn.status)}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
