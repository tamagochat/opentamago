"use client";

import { useState, useCallback } from "react";
import {
  Book,
  Key,
  ChevronDown,
  ChevronRight,
  List,
  Code,
  Loader2,
  Check,
  Copy,
  ChevronsUpDown,
  ChevronsDownUp,
  FileText,
} from "lucide-react";
import Markdown from "react-markdown";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { JsonViewer } from "~/components/ui/json-viewer";
import type { LorebookEntryDocument } from "~/lib/db/schemas/lorebook";

interface StoredLorebookDisplayProps {
  entries: LorebookEntryDocument[];
  characterName?: string;
  isLoading?: boolean;
}

type ViewMode = "list" | "raw";

function ContentBlock({
  label,
  children,
  copyContent,
  translations,
}: {
  label: string;
  children: React.ReactNode;
  copyContent?: string;
  translations: { copiedToClipboard: string; failedToCopy: string };
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleCopy = useCallback(async () => {
    if (!copyContent) return;
    setCopyStatus("loading");
    try {
      await navigator.clipboard.writeText(copyContent);
      setCopyStatus("success");
      toast.success(translations.copiedToClipboard);
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("idle");
      toast.error(translations.failedToCopy);
    }
  }, [copyContent, translations]);

  const getCopyIcon = () => {
    if (copyStatus === "loading") return <Loader2 className="h-3 w-3 animate-spin" />;
    if (copyStatus === "success") return <Check className="h-3 w-3 text-green-500" />;
    return <Copy className="h-3 w-3" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        {copyContent && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCopy}
            disabled={copyStatus !== "idle"}
          >
            {getCopyIcon()}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

function ContentSection({
  content,
  translations,
}: {
  content: string;
  translations: {
    markdown: string;
    raw: string;
    empty: string;
    copiedToClipboard: string;
    failedToCopy: string;
  };
}) {
  const [renderMarkdown, setRenderMarkdown] = useState(true);
  const [copyStatus, setCopyStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleCopy = useCallback(async () => {
    if (!content) return;
    setCopyStatus("loading");
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("success");
      toast.success(translations.copiedToClipboard);
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("idle");
      toast.error(translations.failedToCopy);
    }
  }, [content, translations]);

  const getCopyIcon = () => {
    if (copyStatus === "loading") return <Loader2 className="h-3 w-3 animate-spin" />;
    if (copyStatus === "success") return <Check className="h-3 w-3 text-green-500" />;
    return <Copy className="h-3 w-3" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground font-medium">Content:</span>
        {content && (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 border rounded-md p-0.5">
              <Button
                variant={renderMarkdown ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-1.5 text-xs gap-1"
                onClick={() => setRenderMarkdown(true)}
              >
                <FileText className="h-3 w-3" />
                {translations.markdown}
              </Button>
              <Button
                variant={!renderMarkdown ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-1.5 text-xs gap-1"
                onClick={() => setRenderMarkdown(false)}
              >
                <Code className="h-3 w-3" />
                {translations.raw}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleCopy}
              disabled={copyStatus !== "idle"}
            >
              {getCopyIcon()}
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-md bg-muted/50 p-3">
        {!content ? (
          <p className="text-sm text-muted-foreground italic">{translations.empty}</p>
        ) : renderMarkdown ? (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
            <Markdown>{content}</Markdown>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm font-mono">{content}</pre>
        )}
      </div>
    </div>
  );
}

function LorebookEntryItem({
  entry,
  index,
  open,
  onOpenChange,
  translations,
}: {
  entry: LorebookEntryDocument;
  index: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  translations: {
    noKeys: string;
    moreKeys: (count: number) => string;
    enabled: string;
    disabled: string;
    priority: string;
    markdown: string;
    raw: string;
    empty: string;
    copiedToClipboard: string;
    failedToCopy: string;
  };
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const handleOpenChange = onOpenChange ?? setInternalOpen;

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 p-3 hover:bg-muted transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground flex-shrink-0">#{index + 1}</span>
              {entry.name && (
                <span className="text-sm font-medium truncate">{entry.name}</span>
              )}
              <div className="flex flex-wrap gap-1">
                {entry.keys.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    {translations.noKeys}
                  </span>
                ) : (
                  <>
                    {entry.keys.slice(0, 3).map((key, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <Key className="mr-1 h-3 w-3" />
                        {key}
                      </Badge>
                    ))}
                    {entry.keys.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        {translations.moreKeys(entry.keys.length - 3)}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
            {entry.comment && (
              <p className="text-xs text-muted-foreground truncate text-left">
                {entry.comment}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={entry.enabled ? "default" : "secondary"}>
            {entry.enabled ? translations.enabled : translations.disabled}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {translations.priority}: {entry.priority}
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border p-4 space-y-3">
          {/* Comment */}
          {entry.comment && (
            <div>
              <span className="text-xs text-muted-foreground font-medium">Comment:</span>
              <p className="text-sm">{entry.comment}</p>
            </div>
          )}

          {/* Keys */}
          <div>
            <span className="text-xs text-muted-foreground font-medium">Keys:</span>
            {entry.keys.length === 0 ? (
              <p className="text-sm text-muted-foreground italic mt-1">
                No keys defined (entry is always active)
              </p>
            ) : (
              <div className="flex flex-wrap gap-1 mt-1">
                {entry.keys.map((key, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {key}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Other Properties */}
          <ContentBlock
            label="Other Properties:"
            copyContent={JSON.stringify(
              {
                enabled: entry.enabled,
                priority: entry.priority,
                position: entry.position,
                insertionOrder: entry.insertionOrder,
                caseSensitive: entry.caseSensitive,
                selective: entry.selective,
                constant: entry.constant,
                secondaryKeys: entry.secondaryKeys,
                useRegex: entry.useRegex,
              },
              null,
              2
            )}
            translations={{
              copiedToClipboard: translations.copiedToClipboard,
              failedToCopy: translations.failedToCopy,
            }}
          >
            <JsonViewer
              data={{
                enabled: entry.enabled,
                priority: entry.priority,
                position: entry.position,
                insertionOrder: entry.insertionOrder,
                caseSensitive: entry.caseSensitive,
                selective: entry.selective,
                constant: entry.constant,
                secondaryKeys: entry.secondaryKeys,
                useRegex: entry.useRegex,
              }}
              defaultExpandLevel={1}
            />
          </ContentBlock>

          {/* Content */}
          <ContentSection
            content={entry.content}
            translations={{
              markdown: translations.markdown,
              raw: translations.raw,
              empty: translations.empty,
              copiedToClipboard: translations.copiedToClipboard,
              failedToCopy: translations.failedToCopy,
            }}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ExpandCollapseButton({
  allExpanded,
  onToggle,
  expandAllLabel,
  collapseAllLabel,
}: {
  allExpanded: boolean;
  onToggle: () => void;
  expandAllLabel: string;
  collapseAllLabel: string;
}) {
  return (
    <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" onClick={onToggle}>
      {allExpanded ? (
        <>
          <ChevronsDownUp className="h-4 w-4" />
          {collapseAllLabel}
        </>
      ) : (
        <>
          <ChevronsUpDown className="h-4 w-4" />
          {expandAllLabel}
        </>
      )}
    </Button>
  );
}

export function StoredLorebookDisplay({
  entries,
  characterName,
  isLoading,
}: StoredLorebookDisplayProps) {
  const t = useTranslations("pokebox");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [entriesExpanded, setEntriesExpanded] = useState<Record<number, boolean>>({});

  const entryTranslations = {
    noKeys: t("lorebook.noKeys"),
    moreKeys: (count: number) => t("lorebook.moreKeys", { count }),
    enabled: t("lorebook.enabled"),
    disabled: t("lorebook.disabled"),
    priority: t("lorebook.priority"),
    markdown: t("viewMode.markdown"),
    raw: t("viewMode.raw"),
    empty: t("empty"),
    copiedToClipboard: t("toast.copiedToClipboard"),
    failedToCopy: t("toast.failedToCopy"),
  };

  const isAllExpanded =
    entries.length > 0 && entries.every((_, i) => entriesExpanded[i] === true);

  const toggleAllEntries = useCallback(() => {
    const newValue = !isAllExpanded;
    const newState: Record<number, boolean> = {};
    entries.forEach((_, i) => {
      newState[i] = newValue;
    });
    setEntriesExpanded(newState);
  }, [isAllExpanded, entries]);

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              {t("lorebook.title")}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                {t("viewMode.list")}
              </Button>
              <Button
                variant={viewMode === "raw" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => setViewMode("raw")}
              >
                <Code className="h-4 w-4" />
                {t("viewMode.raw")}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">
            {t("lorebook.entries", { count: entries.length })}
          </p>
          {viewMode === "list" && entries.length > 0 && (
            <ExpandCollapseButton
              allExpanded={isAllExpanded}
              onToggle={toggleAllEntries}
              expandAllLabel={t("expandAll")}
              collapseAllLabel={t("collapseAll")}
            />
          )}
        </div>
        <ScrollArea className="h-[calc(100%-40px)]">
          {viewMode === "list" ? (
            <div className="space-y-2 pr-4">
              {entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("lorebook.noEntries")}
                </div>
              ) : (
                entries.map((entry, i) => (
                  <LorebookEntryItem
                    key={entry.id || i}
                    entry={entry}
                    index={i}
                    open={entriesExpanded[i] ?? false}
                    onOpenChange={(open) =>
                      setEntriesExpanded((prev) => ({ ...prev, [i]: open }))
                    }
                    translations={entryTranslations}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="pr-4">
              <JsonViewer
                data={entries}
                shouldExpandNode={(level, _value, field) => {
                  if (level === 0) return true;
                  if (level === 1) return false;
                  return false;
                }}
              />
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
