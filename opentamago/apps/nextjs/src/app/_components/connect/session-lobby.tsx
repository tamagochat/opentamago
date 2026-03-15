"use client";

import { useState, useCallback, memo } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Copy, Check, Play } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card } from "~/components/ui/card";
import { ParticipantList } from "./participant-list";
import { LeaveConfirmDialog } from "./leave-confirm-dialog";
import type { Participant } from "./hooks/use-connect-peers";
import type { CharacterData } from "~/lib/connect/messages";

interface SessionLobbyProps {
  shortSlug: string;
  longSlug: string | null;
  myPeerId?: string;
  myCharacter: CharacterData;
  participants: Participant[];
  isHost: boolean;
  isConnecting: boolean;
  onStartChat: () => void;
  onLeave: () => void;
}

export const SessionLobby = memo(function SessionLobby({
  shortSlug,
  longSlug,
  myPeerId,
  myCharacter,
  participants,
  isHost,
  isConnecting,
  onStartChat,
  onLeave,
}: SessionLobbyProps) {
  const t = useTranslations("connect");
  const [copiedShort, setCopiedShort] = useState(false);
  const [copiedLong, setCopiedLong] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shortUrl = `${baseUrl}/p2p/connect/${shortSlug}`;
  const longUrl = longSlug ? `${baseUrl}/p2p/connect/${longSlug}` : null;

  const copyToClipboard = useCallback(
    async (text: string, type: "short" | "long") => {
      try {
        await navigator.clipboard.writeText(text);
        if (type === "short") {
          setCopiedShort(true);
          setTimeout(() => setCopiedShort(false), 2000);
        } else {
          setCopiedLong(true);
          setTimeout(() => setCopiedLong(false), 2000);
        }
        toast.success(t("lobby.copied"));
      } catch (err) {
        console.error("Failed to copy:", err);
        toast.error(t("lobby.copyFailed"));
      }
    },
    [t]
  );

  // Count ready participants (those with characters) including self
  const readyParticipants = participants.filter(
    (p) => p.status === "ready" && p.character !== null
  );
  const totalReadyCount = readyParticipants.length + 1; // +1 for self
  const canStart = totalReadyCount >= 2;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t("lobby.title")}</h2>
        <p className="text-muted-foreground mt-1">
          {isHost ? t("lobby.hostDescription") : t("lobby.guestDescription")}
        </p>
      </div>

      {/* Share Links (Host only) */}
      {isHost && (
        <Card className="flex flex-col gap-6 sm:flex-row p-6">
          {/* QR Code */}
          <div className="flex justify-center sm:justify-start">
            <Card className="bg-white p-3">
              <QRCode value={shortUrl} size={140} />
            </Card>
          </div>

          {/* URLs */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {t("lobby.shortUrl")}
              </Label>
              <div className="flex gap-2">
                <Input value={shortUrl} readOnly className="bg-muted/50 text-sm" />
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => copyToClipboard(shortUrl, "short")}
                  className="shrink-0"
                >
                  {copiedShort ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {longUrl && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {t("lobby.longUrl")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={longUrl}
                    readOnly
                    className="bg-muted/50 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => copyToClipboard(longUrl, "long")}
                    className="shrink-0"
                  >
                    {copiedLong ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Participants */}
      <ParticipantList
        myPeerId={myPeerId ?? "self"}
        myCharacter={myCharacter}
        participants={participants}
        isHost={isHost}
        isConnecting={isConnecting}
        variant="lobby"
        showPending={true}
        maxParticipants={8}
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setShowLeaveConfirm(true)} className="flex-1">
          {t("lobby.leave")}
        </Button>
        <Button
          onClick={onStartChat}
          disabled={!canStart}
          className="flex-1"
        >
          <Play className="h-4 w-4 mr-2" />
          {t("lobby.startChat")}
        </Button>
      </div>

      {!canStart && (
        <p className="text-center text-sm text-muted-foreground">
          {t("lobby.needMoreParticipants")}
        </p>
      )}

      <LeaveConfirmDialog
        open={showLeaveConfirm}
        onOpenChange={setShowLeaveConfirm}
        onConfirm={onLeave}
      />
    </div>
  );
});
