"use client";

import { useCallback, useState, memo } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
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
import { useLorebookContext, useFormContext } from "./editor-context";
import { useAssistantActionsContext, useLoadingContext } from "./assistant-context";
import { LorebookEntryForm } from "./lorebook-entry-form";

// Container component - connects to context
export const LorebookEditorContainer = memo(function LorebookEditorContainer() {
  const { entries, addEntry, updateEntry, deleteEntry } = useLorebookContext();
  const { form } = useFormContext();
  const { sendMessage } = useAssistantActionsContext();
  const { isLoading } = useLoadingContext();

  const handleExpandWorld = useCallback(async () => {
    const name = form.getValues("name");
    const description = form.getValues("description");
    const scenario = form.getValues("scenario");
    const personality = form.getValues("personality");

    const existingKeys = entries.flatMap((e) => e.keys).slice(0, 20);

    const prompt = `Generate 5 new lorebook entries to expand this character's world and lore.

Character Name: ${name || "the character"}
Description: ${description || "No description provided"}
Personality: ${personality || "No personality defined"}
Scenario: ${scenario || "No scenario set"}

Existing lorebook keys: ${existingKeys.length > 0 ? existingKeys.join(", ") : "None yet"}

For each entry, provide:
1. **Entry Name** - A short title for this lore element
2. **Trigger Keywords** - Words/phrases that should trigger this lore (comma-separated)
3. **Content** - Rich contextual content (1-2 paragraphs) that will be injected into the conversation

Format each entry as:

**[Entry Name]**
Keywords: [keyword1, keyword2, keyword3]
Content: [Detailed lore content that enriches the roleplay experience. Include relevant details about the character's world, relationships, backstory, locations, or concepts.]

Generate diverse entries covering different aspects like: locations, relationships, backstory elements, important objects, cultural details, or recurring concepts relevant to this character's roleplay scenarios.`;

    await sendMessage(prompt);
  }, [form, entries, sendMessage]);

  return (
    <LorebookEditor
      entries={entries}
      onAdd={addEntry}
      onUpdate={updateEntry}
      onDelete={deleteEntry}
      onExpandWorld={handleExpandWorld}
      isExpanding={isLoading}
    />
  );
});

// Main component - memoized
interface LorebookEditorProps {
  entries: LorebookEntryFormData[];
  onAdd: (entry?: Partial<LorebookEntryFormData>) => void;
  onUpdate: (id: string, updates: Partial<LorebookEntryFormData>) => void;
  onDelete: (id: string) => void;
  onExpandWorld: () => void;
  isExpanding: boolean;
}

const LorebookEditor = memo(function LorebookEditor({
  entries,
  onAdd,
  onUpdate,
  onDelete,
  onExpandWorld,
  isExpanding,
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
    return (
      <EmptyLorebookState
        onAdd={handleAddEntry}
        onExpandWorld={onExpandWorld}
        isExpanding={isExpanding}
      />
    );
  }

  return (
    <div className="space-y-4">
      <LorebookHeader
        onAdd={handleAddEntry}
        onExpandWorld={onExpandWorld}
        isExpanding={isExpanding}
      />

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
  onExpandWorld,
  isExpanding,
}: {
  onAdd: () => void;
  onExpandWorld: () => void;
  isExpanding: boolean;
}) {
  const t = useTranslations("charxEditor.editor.lorebook");

  return (
    <div className="h-full flex flex-col items-center justify-center py-12">
      <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground mb-2">{t("empty")}</p>
      <p className="text-sm text-muted-foreground/70 mb-4">{t("emptyHint")}</p>
      <div className="flex flex-col items-center gap-3">
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addEntry")}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onExpandWorld}
                disabled={isExpanding}
              >
                {isExpanding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {t("expandWorld")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("expandWorldHint")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
});

// Header component - memoized
const LorebookHeader = memo(function LorebookHeader({
  onAdd,
  onExpandWorld,
  isExpanding,
}: {
  onAdd: () => void;
  onExpandWorld: () => void;
  isExpanding: boolean;
}) {
  const t = useTranslations("charxEditor.editor.lorebook");

  return (
    <div className="flex items-center justify-between">
      <h3 className="font-medium">{t("title")}</h3>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onExpandWorld}
                disabled={isExpanding}
              >
                {isExpanding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {t("expandWorld")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("expandWorldHint")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addEntry")}
        </Button>
      </div>
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
