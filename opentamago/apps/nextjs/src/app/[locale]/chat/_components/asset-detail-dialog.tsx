"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CharacterAssetDocument } from "~/lib/db/schemas";

interface AssetDetailDialogProps {
  assets: CharacterAssetDocument[];
  assetUrls: Record<string, string>;
  selectedId: string | null;
  onClose: () => void;
}

function AssetDetailDialogInner({
  assets,
  assetUrls,
  selectedId,
  onClose,
}: AssetDetailDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Sync currentIndex when selectedId changes (dialog opens)
  useEffect(() => {
    if (selectedId) {
      const index = assets.findIndex((a) => a.id === selectedId);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [selectedId, assets]);

  const asset = currentIndex >= 0 ? assets[currentIndex] : null;
  const assetUrl = asset ? assetUrls[asset.id] : null;
  const isOpen = selectedId !== null && asset !== null;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : assets.length - 1));
  }, [assets.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < assets.length - 1 ? prev + 1 : 0));
  }, [assets.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || assets.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, assets.length, handlePrev, handleNext]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const assetTypeLabels: Record<string, string> = {
    icon: "Icon",
    emotion: "Emotion",
    background: "Background",
    other: "Other",
  };

  if (!asset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-8">{asset.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 flex-1">
          {/* Image Preview */}
          {assetUrl && (
            <div className="bg-muted rounded-md overflow-hidden">
              <img
                src={assetUrl}
                alt={asset.name}
                className="w-full max-h-[300px] object-contain"
              />
            </div>
          )}

          {/* Asset Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {assetTypeLabels[asset.assetType] || asset.assetType}
            </Badge>
            <Badge variant="outline">.{asset.ext}</Badge>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Original URI:</span>
              <p className="text-xs font-mono mt-1 break-all bg-muted rounded px-2 py-1">
                {asset.uri}
              </p>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {formatDate(asset.createdAt)}</p>
            <p>Updated: {formatDate(asset.updatedAt)}</p>
          </div>
        </div>

        {/* Navigation Footer */}
        {assets.length > 1 && (
          <DialogFooter className="shrink-0 flex-row justify-between sm:justify-between border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground self-center">
              {currentIndex + 1} / {assets.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export const AssetDetailDialog = memo(AssetDetailDialogInner);
