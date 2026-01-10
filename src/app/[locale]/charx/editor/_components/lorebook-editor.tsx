"use client";

import { useCallback, useState, memo } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { LorebookEntryFormData } from "~/lib/editor/assistant-types";
import { useLorebookContext } from "./editor-context";
import { LorebookEntryForm } from "./lorebook-entry-form";

// Container component - connects to context
export const LorebookEditorContainer = memo(function LorebookEditorContainer() {
  const { entries, addEntry, updateEntry, deleteEntry } = useLorebookContext();
  return (
    <LorebookEditor
      entries={entries}
      onAdd={addEntry}
      onUpdate={updateEntry}
      onDelete={deleteEntry}
    />
  );
});

// Main component - memoized
interface LorebookEditorProps {
  entries: LorebookEntryFormData[];
  onAdd: (entry?: Partial<LorebookEntryFormData>) => void;
  onUpdate: (id: string, updates: Partial<LorebookEntryFormData>) => void;
  onDelete: (id: string) => void;
}

const LorebookEditor = memo(function LorebookEditor({
  entries,
  onAdd,
  onUpdate,
  onDelete,
}: LorebookEditorProps) {
  const [openEntries, setOpenEntries] = useState<Set<string>>(new Set());

  const handleAddEntry = useCallback(() => {
    onAdd();
  }, [onAdd]);

  const toggleEntry = useCallback((id: string) => {
    setOpenEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (entries.length === 0) {
    return <EmptyLorebookState onAdd={handleAddEntry} />;
  }

  return (
    <div className="space-y-4">
      <LorebookHeader onAdd={handleAddEntry} />

      <div className="space-y-2">
        {entries.map((entry, index) => (
          <LorebookEntryItem
            key={entry.id}
            entry={entry}
            index={index}
            isOpen={openEntries.has(entry.id!)}
            onToggle={() => toggleEntry(entry.id!)}
            onUpdate={onUpdate}
            onDelete={() => onDelete(entry.id!)}
          />
        ))}
      </div>
    </div>
  );
});

// Empty state component - memoized
const EmptyLorebookState = memo(function EmptyLorebookState({
  onAdd,
}: {
  onAdd: () => void;
}) {
  const t = useTranslations("charxEditor.editor.lorebook");

  return (
    <div className="h-full flex flex-col items-center justify-center py-12">
      <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground mb-2">{t("empty")}</p>
      <p className="text-sm text-muted-foreground/70 mb-4">{t("emptyHint")}</p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        {t("addEntry")}
      </Button>
    </div>
  );
});

// Header component - memoized
const LorebookHeader = memo(function LorebookHeader({
  onAdd,
}: {
  onAdd: () => void;
}) {
  const t = useTranslations("charxEditor.editor.lorebook");

  return (
    <div className="flex items-center justify-between">
      <h3 className="font-medium">{t("title")}</h3>
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        {t("addEntry")}
      </Button>
    </div>
  );
});

// Entry item component - memoized
const LorebookEntryItem = memo(function LorebookEntryItem({
  entry,
  index,
  isOpen,
  onToggle,
  onUpdate,
  onDelete,
}: {
  entry: LorebookEntryFormData;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Partial<LorebookEntryFormData>) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("charxEditor.editor.lorebook");
  const [deletePopoverOpen, setDeletePopoverOpen] = useState(false);

  const handleDelete = useCallback(() => {
    onDelete();
    setDeletePopoverOpen(false);
  }, [onDelete]);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border rounded-lg">
        <div className="flex w-full items-center justify-between p-3 hover:bg-muted/50 transition-colors">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex flex-1 items-center gap-3 text-left"
            >
              <span className="text-sm text-muted-foreground w-6">
                #{index + 1}
              </span>
              <div className="flex flex-col items-start gap-1">
                <span className="font-medium text-sm">
                  {entry.name || entry.keys.slice(0, 3).join(", ") || "New Entry"}
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={entry.enabled ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {entry.enabled ? t("enabled") : "Disabled"}
                  </Badge>
                  {entry.keys.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {entry.keys.length} keys
                    </span>
                  )}
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-auto" />
              )}
            </button>
          </CollapsibleTrigger>

          {/* Delete with Popover confirmation */}
          <Popover open={deletePopoverOpen} onOpenChange={setDeletePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-2 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("deleteEntry")}</p>
                <p className="text-xs text-muted-foreground">
                  This cannot be undone.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletePopoverOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <CollapsibleContent>
          <LorebookEntryForm entry={entry} onUpdate={onUpdate} />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
});
