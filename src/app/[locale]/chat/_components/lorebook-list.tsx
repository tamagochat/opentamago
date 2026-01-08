"use client";

import { useState, useCallback } from "react";
import { useLorebookEntries } from "~/lib/db/hooks";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { Info, Trash2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { LorebookDetailDialog } from "./lorebook-detail-dialog";

interface LorebookListProps {
  characterId: string;
}

export function LorebookList({ characterId }: LorebookListProps) {
  const { entries, isLoading, deleteEntry } = useLorebookEntries(characterId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleDelete = async (id: string, name?: string) => {
    if (confirm(`Delete lorebook entry${name ? ` "${name}"` : ""}?`)) {
      await deleteEntry(id);
    }
  };

  const handleCloseDialog = useCallback(() => {
    setSelectedId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-8 text-sm">
        No lorebook entries yet
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full -mx-4 px-4">
        <div className="space-y-3 pb-4">
          {entries.map((entry) => (
            <Card key={entry.id} className={cn("py-4", !entry.enabled && "opacity-50")}>
              <CardHeader>
                <CardTitle className="text-sm">
                  {entry.name || "Untitled Entry"}
                </CardTitle>
                <CardAction className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDelete(entry.id, entry.name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardAction>
                <div className="flex flex-wrap gap-1">
                  {entry.keys.map((key, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {key.length > 10 ? `${key.slice(0, 10)}...` : key}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3 break-words">
                  {entry.content}
                </p>
                {(entry.constant || !entry.enabled || entry.priority !== 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {entry.constant && <Badge variant="outline" className="text-xs">Constant</Badge>}
                    {!entry.enabled && <Badge variant="outline" className="text-xs">Disabled</Badge>}
                    {entry.priority !== 0 && (
                      <Badge variant="outline" className="text-xs">Priority: {entry.priority}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <LorebookDetailDialog
        entries={entries}
        selectedId={selectedId}
        onClose={handleCloseDialog}
      />
    </>
  );
}
