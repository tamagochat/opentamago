"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";
import { Users, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { Participant } from "./hooks/use-connect-peers";
import type { CharacterData, CharacterInfo, ParticipantStatus } from "~/lib/connect/messages";

// ============================================================================
// Types
// ============================================================================

interface ParticipantItemProps {
  peerId: string;
  character: CharacterData | CharacterInfo | null;
  status: ParticipantStatus;
  isMe?: boolean;
  isHost?: boolean;
  variant?: "lobby" | "sidebar";
}

interface SelfParticipantProps {
  character: CharacterData;
  isHost?: boolean;
  variant?: "lobby" | "sidebar";
}

interface ParticipantListProps {
  myPeerId: string;
  myCharacter: CharacterData;
  participants: Participant[];
  isHost?: boolean;
  isConnecting?: boolean;
  variant?: "lobby" | "sidebar";
  showPending?: boolean;
  maxParticipants?: number;
}

// ============================================================================
// Memoized Components
// ============================================================================

/**
 * Individual participant item - memoized to prevent re-renders
 */
export const ParticipantItem = memo(function ParticipantItem({
  peerId,
  character,
  status,
  isMe = false,
  isHost = false,
  variant = "lobby",
}: ParticipantItemProps) {
  const t = useTranslations("connect");

  const isLobby = variant === "lobby";
  const avatarSize = isLobby ? "h-14 w-14" : "h-8 w-8";
  const textSize = isLobby ? "text-base" : "text-sm";
  const fallbackTextSize = isLobby ? "text-lg" : "text-xs";

  // Ready state with character
  if (status === "ready" && character) {
    if (isLobby) {
      return (
        <Card
          className={cn(
            "flex items-center gap-3 p-3 transition-colors overflow-hidden",
            isMe
              ? "bg-primary/5 border-primary/20"
              : "hover:bg-accent border-border"
          )}
        >
          <Avatar className={cn(avatarSize, "shrink-0")}>
            <AvatarImage src={character.avatar} />
            <AvatarFallback className={cn(fallbackTextSize, "font-semibold")}>
              {character.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className={cn("font-semibold leading-tight truncate", textSize)}>
              {character.name}
            </p>
            {isMe && (
              <p className="text-sm text-muted-foreground leading-tight truncate">
                {t("lobby.you")}
                {isHost && ` • ${t("lobby.host")}`}
              </p>
            )}
          </div>
        </Card>
      );
    }

    // Sidebar variant
    return (
      <div className="flex items-center gap-2">
        <Avatar className={avatarSize}>
          <AvatarImage src={character.avatar} />
          <AvatarFallback className={fallbackTextSize}>
            {character.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium truncate", textSize)}>
            {character.name}
          </p>
          {isMe && (
            <p className="text-xs text-muted-foreground">{t("lobby.you")}</p>
          )}
        </div>
      </div>
    );
  }

  // Pending/connecting state
  if (isLobby) {
    return (
      <Card className="flex items-center gap-3 p-3 border-dashed opacity-70 overflow-hidden">
        <div
          className={cn(
            avatarSize,
            "shrink-0 rounded-full bg-muted flex items-center justify-center"
          )}
        >
          {status === "connecting" ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <Users className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="text-sm text-muted-foreground truncate">
            {status === "connecting"
              ? t("lobby.connecting")
              : t("lobby.selectingCharacter")}
          </p>
        </div>
      </Card>
    );
  }

  // Sidebar pending variant
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <div
        className={cn(
          avatarSize,
          "rounded-full bg-muted flex items-center justify-center"
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
      <span className="text-xs truncate">{t("lobby.selectingCharacter")}</span>
    </div>
  );
});

/**
 * Waiting placeholder shown when no participants have joined yet
 */
const WaitingPlaceholder = memo(function WaitingPlaceholder({
  isConnecting,
  variant = "lobby",
}: {
  isConnecting: boolean;
  variant?: "lobby" | "sidebar";
}) {
  const t = useTranslations("connect");

  if (variant !== "lobby") return null;

  return (
    <Card className="flex items-center gap-3 p-3 border-dashed">
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
        {isConnecting ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Users className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {isConnecting ? t("lobby.connecting") : t("lobby.waitingForOthers")}
      </p>
    </Card>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * Participant list component for lobby and chat room sidebar
 * Optimized to minimize re-renders when participant data changes
 */
export const ParticipantList = memo(function ParticipantList({
  myPeerId,
  myCharacter,
  participants,
  isHost = false,
  isConnecting = false,
  variant = "lobby",
  showPending = true,
  maxParticipants = 8,
}: ParticipantListProps) {
  const t = useTranslations("connect");

  // Split participants into active and pending
  const activeParticipants = participants.filter(
    (p) => p.status === "ready" && p.character !== null
  );
  const pendingParticipants = participants.filter(
    (p) => p.status === "pending" || p.status === "connecting"
  );

  const totalCount = activeParticipants.length + 1; // +1 for self

  if (variant === "lobby") {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("lobby.participants")}
          </h3>
          <Badge variant="secondary">
            {totalCount + pendingParticipants.length} / {maxParticipants}
          </Badge>
        </div>

        <div className="space-y-3">
          {/* Self */}
          <ParticipantItem
            peerId={myPeerId}
            character={myCharacter}
            status="ready"
            isMe={true}
            isHost={isHost}
            variant="lobby"
          />

          {/* Active participants */}
          {activeParticipants.map((participant) => (
            <ParticipantItem
              key={participant.peerId}
              peerId={participant.peerId}
              character={participant.character}
              status={participant.status}
              variant="lobby"
            />
          ))}

          {/* Pending participants */}
          {showPending &&
            pendingParticipants.map((participant) => (
              <ParticipantItem
                key={participant.peerId}
                peerId={participant.peerId}
                character={null}
                status={participant.status}
                variant="lobby"
              />
            ))}

          {/* Waiting placeholder when no one has joined */}
          {activeParticipants.length === 0 &&
            pendingParticipants.length === 0 && (
              <WaitingPlaceholder isConnecting={isConnecting} variant="lobby" />
            )}
        </div>
      </Card>
    );
  }

  // Sidebar variant for chat room
  return (
    <>
      {/* Active Participants */}
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold">{t("chat.active")}</h3>
        <Badge variant="secondary" className="text-xs">
          {totalCount}
        </Badge>
      </div>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {/* Self */}
        <ParticipantItem
          peerId={myPeerId}
          character={myCharacter}
          status="ready"
          isMe={true}
          variant="sidebar"
        />

        {/* Active participants */}
        {activeParticipants.map((participant) => (
          <ParticipantItem
            key={participant.peerId}
            peerId={participant.peerId}
            character={participant.character}
            status={participant.status}
            variant="sidebar"
          />
        ))}
      </div>

      {/* Pending Participants */}
      {showPending && pendingParticipants.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t("chat.pending")}
            </h4>
            <Badge variant="outline" className="text-xs">
              {pendingParticipants.length}
            </Badge>
          </div>
          <div className="space-y-2">
            {pendingParticipants.map((participant) => (
              <ParticipantItem
                key={participant.peerId}
                peerId={participant.peerId}
                character={null}
                status={participant.status}
                variant="sidebar"
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
});
