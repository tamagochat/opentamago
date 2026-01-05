"use client";

import { Loader2, Wifi, WifiOff, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

interface ConnectionStatusProps {
  isConnecting: boolean;
  error: string | null;
}

export function ConnectionStatus({ isConnecting, error }: ConnectionStatusProps) {
  const t = useTranslations("connect");

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full text-sm",
        isConnecting
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          : error
          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      )}
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("status.connecting")}
        </>
      ) : error ? (
        <>
          <WifiOff className="h-4 w-4" />
          {t("status.disconnected")}
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          {t("status.connected")}
          <Popover>
            <PopoverTrigger asChild>
              <button className="ml-1 hover:opacity-70 transition-opacity">
                <Info className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto text-sm">
              {t("status.connectedInfo")}
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
