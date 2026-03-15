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
import type { LorebookEntryDocument } from "~/lib/db/schemas";

interface LorebookDetailDialogProps {
  entries: LorebookEntryDocument[];
  selectedId: string | null;
  onClose: () => void;
}

function LorebookDetailDialogInner({
  entries,
  selectedId,
  onClose,
}: LorebookDetailDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const isOpen = selectedId !== null;
  const entry = currentIndex >= 0 ? entries[currentIndex] : null;

  // Sync currentIndex when selectedId changes (dialog opens)
  useEffect(() => {
    if (selectedId) {
      const index = entries.findIndex((e) => e.id === selectedId);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [selectedId, entries]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : entries.length - 1));
  }, [entries.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < entries.length - 1 ? prev + 1 : 0));
  }, [entries.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || entries.length <= 1) return;

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
  }, [isOpen, entries.length, handlePrev, handleNext]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const positionLabels: Record<string, string> = {
    before_char: "Before Character",
    after_char: "After Character",
    before_system: "Before System",
    after_system: "After System",
  };

  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col gap-0 overflow-hidden [&>button]:top-3">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle className="pr-8">
            {entry.name || "Untitled Entry"}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(80vh-180px)] overflow-y-auto pr-2">
          <div className="space-y-4 pb-2">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={entry.enabled ? "default" : "secondary"}>
                {entry.enabled ? "Enabled" : "Disabled"}
              </Badge>
              {entry.constant && <Badge variant="outline">Constant</Badge>}
              {entry.selective && <Badge variant="outline">Selective</Badge>}
              {entry.caseSensitive && (
                <Badge variant="outline">Case Sensitive</Badge>
              )}
              {entry.useRegex && <Badge variant="outline">Regex</Badge>}
            </div>

            <Separator />

            {/* Primary Keys */}
            <div>
              <h4 className="text-sm font-medium mb-2">Trigger Keys</h4>
              <div className="flex flex-wrap gap-1">
                {entry.keys.length > 0 ? (
                  entry.keys.map((key, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {key}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No keys defined
                  </span>
                )}
              </div>
            </div>

            {/* Secondary Keys */}
            {entry.secondaryKeys.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Secondary Keys</h4>
                <div className="flex flex-wrap gap-1">
                  {entry.secondaryKeys.map((key, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {key}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Content */}
            <div>
              <h4 className="text-sm font-medium mb-2">Content</h4>
              <div className="bg-muted rounded-md p-3">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {entry.content || "No content"}
                </p>
              </div>
            </div>

            {/* Comment */}
            {entry.comment && (
              <div>
                <h4 className="text-sm font-medium mb-2">Comment</h4>
                <p className="text-sm text-muted-foreground">{entry.comment}</p>
              </div>
            )}

            <Separator />

            {/* Settings */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Position:</span>
                <span className="ml-2">
                  {positionLabels[entry.position] || entry.position}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Priority:</span>
                <span className="ml-2">{entry.priority}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Insertion Order:</span>
                <span className="ml-2">{entry.insertionOrder}</span>
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Created: {formatDate(entry.createdAt)}</p>
              <p>Updated: {formatDate(entry.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        {entries.length > 1 && (
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
              {currentIndex + 1} / {entries.length}
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

export const LorebookDetailDialog = memo(LorebookDetailDialogInner);
