"use client";

import { useState, useEffect } from "react";
import { FlaskConical, X } from "lucide-react";
import { useTranslations } from "next-intl";

type DisclaimerType = "charx" | "p2p" | "chat";

interface ExperimentalDisclaimerProps {
  type: DisclaimerType;
}

const STORAGE_KEY = "experimental-disclaimer-dismissed";

function getDismissedState(): Record<DisclaimerType, boolean> {
  if (typeof window === "undefined") return { charx: false, p2p: false, chat: false };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { charx: false, p2p: false, chat: false };
}

function setDismissedState(type: DisclaimerType) {
  try {
    const current = getDismissedState();
    current[type] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}

export function ExperimentalDisclaimer({ type }: ExperimentalDisclaimerProps) {
  const tExp = useTranslations("experimental");
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const dismissed = getDismissedState();
    setIsDismissed(dismissed[type] ?? false);
  }, [type]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setDismissedState(type);
  };

  // Don't render on server or if dismissed
  if (!isMounted || isDismissed) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-amber-600/70 hover:text-amber-700 hover:bg-amber-500/20 dark:text-amber-400/70 dark:hover:text-amber-300 dark:hover:bg-amber-500/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-300">
            {tExp("badge")}
          </p>
          <p className="text-amber-600/90 dark:text-amber-400/90">
            {tExp(type)}
          </p>
          <p className="text-amber-600/80 dark:text-amber-400/80">
            {tExp.rich("feedback", {
              link: (chunks) => (
                <a
                  href="https://github.com/tamagochat/opentamago/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-700 dark:hover:text-amber-300"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
