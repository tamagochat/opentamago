"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Lock, Share2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { MainLayout } from "~/components/layout";
import {
  WebRTCProvider,
  useWebRTCPeer,
  DropZone,
  FileInfo,
  ShareLinks,
  ConnectionList,
  useUploaderChannel,
  useUploaderConnections,
} from "~/app/_components/p2p";

type PageState = "initial" | "confirm" | "sharing";

function P2PContent() {
  const t = useTranslations("p2p");
  const { peer, peerId, isConnecting, error: peerError } = useWebRTCPeer();
  const [state, setState] = useState<PageState>("initial");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [channel, setChannel] = useState<{
    shortSlug: string;
    longSlug: string;
    secret: string;
  } | null>(null);

  const { createChannel, destroyChannel, isCreating, error: channelError } =
    useUploaderChannel({
      uploaderPeerId: peerId,
      file,
      password: password || undefined,
      onChannelCreated: setChannel,
    });

  const { connections, activeCount, totalDownloads } = useUploaderConnections({
    peer,
    file,
    password: password || undefined,
  });

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
    setState("confirm");
  }, []);

  const handleCancel = useCallback(() => {
    setFile(null);
    setPassword("");
    setState("initial");
  }, []);

  const handleStart = useCallback(async () => {
    if (!peerId || !file) return;
    await createChannel();
    setState("sharing");
  }, [peerId, file, createChannel]);

  const handleStopSharing = useCallback(() => {
    destroyChannel();
    setChannel(null);
    setFile(null);
    setPassword("");
    setState("initial");
  }, [destroyChannel]);

  // Initial State - Drop Zone
  if (state === "initial") {
    return (
      <div className="space-y-6">
        <DropZone onFileSelect={handleFileSelect} />

        <p className="text-center text-sm text-muted-foreground">
          {t("privacyNote")}
        </p>
      </div>
    );
  }

  // Confirm State - Review file and set password
  if (state === "confirm" && file) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium mb-4">{t("confirmSubtitle")}</p>
          <FileInfo file={file} onRemove={handleCancel} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {t("passwordLabel")}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
        </div>

        {(peerError || channelError) && (
          <p className="text-sm text-destructive">{peerError || channelError}</p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleStart}
            disabled={isConnecting || isCreating || !peerId}
            className="flex-1"
          >
            {isConnecting || isCreating ? t("connecting") : t("start")}
          </Button>
        </div>
      </div>
    );
  }

  // Sharing State - Show QR code and URLs
  if (state === "sharing" && file && channel) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-green-500/10 border-green-500/30 p-4">
          <p className="text-sm text-green-600 dark:text-green-400 mb-4">
            {t("sharingSubtitle")}
          </p>
          <FileInfo file={file} showRemove={false} />
        </div>

        <ShareLinks shortSlug={channel.shortSlug} longSlug={channel.longSlug} />

        <ConnectionList
          connections={connections}
          fileSize={file.size}
          activeCount={activeCount}
          totalDownloads={totalDownloads}
        />

        <div className="flex flex-col items-center gap-3 pt-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="destructive">
                {t("stopSharing")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-3">
                <p className="font-medium">{t("stopSharingConfirm")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("stopSharingDescription")}
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStopSharing}
                  >
                    {t("confirmStop")}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <p className="text-sm text-muted-foreground text-center">
            {t("sharingWarning")}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function P2PPage() {
  const t = useTranslations("p2p");

  return (
    <MainLayout showFooter={false}>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        <WebRTCProvider>
          <P2PContent />
        </WebRTCProvider>
      </div>
    </MainLayout>
  );
}
