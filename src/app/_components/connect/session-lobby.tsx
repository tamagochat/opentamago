"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Copy, Check, Users, Play, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { Participant } from "./hooks/use-connect-peers";
import type { CharacterData } from "~/lib/connect/messages";

interface SessionLobbyProps {
  shortSlug: string;
  longSlug: string | null;
  myCharacter: CharacterData;
  participants: Participant[];
  isHost: boolean;
  isConnecting: boolean;
  onStartChat: () => void;
  onLeave: () => void;
}

export function SessionLobby({
  shortSlug,
  longSlug,
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

  // Total participants including self
  const totalParticipants = participants.length + 1;
  const canStart = totalParticipants >= 2;

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
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("lobby.participants")}
          </h3>
          <Badge variant="secondary">{totalParticipants} / 8</Badge>
        </div>

        <div className="space-y-3">
          {/* Self */}
          <Card className="flex items-center gap-3 p-2 bg-primary/5 border-primary/20">
            <Avatar className="h-10 w-10">
              <AvatarImage src={myCharacter.avatar} />
              <AvatarFallback>
                {myCharacter.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{myCharacter.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {t("lobby.you")}
                {isHost && ` • ${t("lobby.host")}`}
              </p>
            </div>
          </Card>

          {/* Other participants */}
          {participants.map((participant) => (
            <Card
              key={participant.peerId}
              className={cn(
                "flex items-center gap-3 p-2 transition-colors",
                participant.status === "ready"
                  ? "hover:bg-accent"
                  : "border-dashed opacity-70"
              )}
            >
              {participant.status === "ready" && participant.character ? (
                <>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={participant.character.avatar} />
                    <AvatarFallback>
                      {participant.character.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {participant.character.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {participant.character.description}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {participant.status === "connecting" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {participant.status === "connecting"
                        ? t("lobby.connecting")
                        : t("lobby.selectingCharacter")}
                    </p>
                  </div>
                </>
              )}
            </Card>
          ))}

          {/* Waiting indicator */}
          {isConnecting && (
            <Card className="flex items-center gap-3 p-2 border-dashed">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("lobby.connecting")}
              </p>
            </Card>
          )}

          {/* Waiting for others */}
          {!isConnecting && participants.length === 0 && (
            <Card className="flex items-center gap-3 p-2 border-dashed">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("lobby.waitingForOthers")}
              </p>
            </Card>
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onLeave} className="flex-1">
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
    </div>
  );
}
