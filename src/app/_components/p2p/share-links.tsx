"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface ShareLinksProps {
  shortSlug: string;
  longSlug: string;
}

export function ShareLinks({ shortSlug, longSlug }: ShareLinksProps) {
  const t = useTranslations("charx.toast");
  const [copiedShort, setCopiedShort] = useState(false);
  const [copiedLong, setCopiedLong] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const shortUrl = `${baseUrl}/p2p/share/${shortSlug}`;
  const longUrl = `${baseUrl}/p2p/share/${longSlug}`;

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
        toast.success(t("copiedToClipboard"));
      } catch (err) {
        console.error("Failed to copy:", err);
        toast.error(t("failedToCopy"));
      }
    },
    [t]
  );

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      {/* QR Code */}
      <div className="flex justify-center sm:justify-start">
        <div className="rounded-lg bg-white p-3">
          <QRCode value={shortUrl} size={140} />
        </div>
      </div>

      {/* URLs */}
      <div className="flex-1 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Long URL</Label>
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
              <span className="ml-2">Copy</span>
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Short URL</Label>
          <div className="flex gap-2">
            <Input
              value={shortUrl}
              readOnly
              className="bg-muted/50 text-sm"
            />
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
              <span className="ml-2">Copy</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
