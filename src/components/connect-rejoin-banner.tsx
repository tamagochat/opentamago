"use client";

import { useEffect, useState } from "react";
import { Link } from "~/i18n/routing";
import { useConnectStore } from "~/lib/stores/connect-store";
import { useConnectSession } from "~/lib/db/hooks";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { X } from "lucide-react";

export function ConnectRejoinBanner() {
  const { sessionInfo, participants } = useConnectStore();
  const { session } = useConnectSession();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when session changes
  useEffect(() => {
    setDismissed(false);
  }, [session?.id]);

  // Check if we should show the banner
  // Only show if there's a session that was left and not currently in chat
  const shouldShow =
    !dismissed &&
    session?.wasInChat &&
    sessionInfo !== null;

  if (!shouldShow) return null;

  const participantCount = Array.from(participants.values()).filter(
    (p) => p.status === "ready"
  ).length;

  const rejoinUrl = `/p2p/connect/${session.slug}`;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-sm font-medium">
              Chat session active
              {participantCount > 0 && (
                <>
                  {" "}
                  with{" "}
                  <Badge variant="secondary" className="ml-1">
                    {participantCount} participant{participantCount !== 1 ? "s" : ""}
                  </Badge>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="secondary"
              className="font-semibold"
            >
              <Link href={rejoinUrl}>Rejoin Chat</Link>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
