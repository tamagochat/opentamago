"use client";

import { useState, useCallback } from "react";
import { Book, Key, ChevronDown, ChevronRight, List, Code, Download, FileDown, Clipboard, Loader2, Check, Copy, ChevronsUpDown, ChevronsDownUp, FileText } from "lucide-react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { JsonViewer } from "~/components/ui/json-viewer";
import type { CharacterBook } from "~/lib/charx/types";

interface LorebookDisplayProps {
  lorebook: CharacterBook;
  characterName?: string;
  originalFilename?: string;
}

interface ContentBlockProps {
  label: string;
  children: React.ReactNode;
  copyContent?: string;
  className?: string;
}

function ContentBlock({ label, children, copyContent, className }: ContentBlockProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleCopy = useCallback(async () => {
    if (!copyContent) return;
    setCopyStatus("loading");
    try {
      await navigator.clipboard.writeText(copyContent);
      setCopyStatus("success");
      toast.success("Copied to clipboard");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("idle");
      toast.error("Failed to copy");
    }
  }, [copyContent]);

  const getCopyIcon = () => {
    if (copyStatus === "loading") return <Loader2 className="h-3 w-3 animate-spin" />;
    if (copyStatus === "success") return <Check className="h-3 w-3 text-green-500" />;
    return <Copy className="h-3 w-3" />;
  };

  return (
    <div className={className}>
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

function ContentSection({ content }: { content: string }) {
  const [renderMarkdown, setRenderMarkdown] = useState(true);
  const [copyStatus, setCopyStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleCopy = useCallback(async () => {
    if (!content) return;
    setCopyStatus("loading");
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("success");
      toast.success("Copied to clipboard");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("idle");
      toast.error("Failed to copy");
    }
  }, [content]);

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
                Markdown
              </Button>
              <Button
                variant={!renderMarkdown ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-1.5 text-xs gap-1"
                onClick={() => setRenderMarkdown(false)}
              >
                <Code className="h-3 w-3" />
                Raw
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
          <p className="text-sm text-muted-foreground italic">Empty</p>
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
}: {
  entry: CharacterBook["entries"][0];
  index: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
              <div className="flex flex-wrap gap-1">
                {entry.keys.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    No keys
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
                        +{entry.keys.length - 3} more
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
            {entry.enabled ? "Enabled" : "Disabled"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            P:{entry.priority}
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border p-4 space-y-3">
          {/* 1. Comment */}
          {entry.comment && (
            <div>
              <span className="text-xs text-muted-foreground font-medium">
                Comment:
              </span>
              <p className="text-sm">{entry.comment}</p>
            </div>
          )}

          {/* 2. Keys */}
          <div>
            <span className="text-xs text-muted-foreground font-medium">
              Keys:
            </span>
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

          {/* 3. Other Properties (JSON) */}
          <ContentBlock
            label="Other Properties:"
            copyContent={JSON.stringify({
              enabled: entry.enabled,
              priority: entry.priority,
              position: entry.position,
              insertion_order: entry.insertion_order,
              case_sensitive: entry.case_sensitive,
              selective: entry.selective,
              constant: entry.constant,
              secondary_keys: entry.secondary_keys,
              id: entry.id,
              extensions: entry.extensions,
            }, null, 2)}
          >
            <JsonViewer
              data={{
                enabled: entry.enabled,
                priority: entry.priority,
                position: entry.position,
                insertion_order: entry.insertion_order,
                case_sensitive: entry.case_sensitive,
                selective: entry.selective,
                constant: entry.constant,
                secondary_keys: entry.secondary_keys,
                id: entry.id,
                extensions: entry.extensions,
              }}
              defaultExpandLevel={1}
            />
          </ContentBlock>

          {/* 4. Content */}
          <ContentSection content={entry.content} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

type ViewMode = "list" | "raw";

function getLorebookFilename(characterName?: string, originalFilename?: string): string {
  // Prefer character name, fallback to original filename (without extension)
  const prefix = characterName?.trim()
    ?? originalFilename?.replace(/\.[^/.]+$/, "").trim()
    ?? "";

  if (prefix) {
    // Sanitize filename: remove invalid characters
    const sanitized = prefix.replace(/[<>:"/\\|?*]/g, "_");
    return `${sanitized}_lorebook.json`;
  }
  return "lorebook.json";
}

function downloadLorebookAsFile(lorebook: CharacterBook, characterName?: string, originalFilename?: string) {
  const json = JSON.stringify(lorebook, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getLorebookFilename(characterName, originalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function copyLorebookToClipboard(lorebook: CharacterBook) {
  const json = JSON.stringify(lorebook, null, 2);
  await navigator.clipboard.writeText(json);
}

type ActionStatus = "idle" | "loading" | "success";

function ExpandCollapseButton({ allExpanded, onToggle }: { allExpanded: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 gap-1"
      onClick={onToggle}
    >
      {allExpanded ? (
        <>
          <ChevronsDownUp className="h-4 w-4" />
          Collapse All
        </>
      ) : (
        <>
          <ChevronsUpDown className="h-4 w-4" />
          Expand All
        </>
      )}
    </Button>
  );
}

export function LorebookDisplay({ lorebook, characterName, originalFilename }: LorebookDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [entriesExpanded, setEntriesExpanded] = useState<Record<number, boolean>>({});

  const isAllExpanded = lorebook.entries.length > 0 && lorebook.entries.every((_, i) => entriesExpanded[i] === true);

  const toggleAllEntries = useCallback(() => {
    const newValue = !isAllExpanded;
    const newState: Record<number, boolean> = {};
    lorebook.entries.forEach((_, i) => {
      newState[i] = newValue;
    });
    setEntriesExpanded(newState);
  }, [isAllExpanded, lorebook.entries]);

  const handleDownload = useCallback(async () => {
    setActionStatus("loading");
    // Small delay to show loading state
    await new Promise((resolve) => setTimeout(resolve, 300));
    downloadLorebookAsFile(lorebook, characterName, originalFilename);
    setActionStatus("success");
    const filename = getLorebookFilename(characterName, originalFilename);
    toast.success("File saved", { description: filename });
    setTimeout(() => setActionStatus("idle"), 2000);
  }, [lorebook, characterName, originalFilename]);

  const handleCopy = useCallback(async () => {
    setActionStatus("loading");
    try {
      await copyLorebookToClipboard(lorebook);
      setActionStatus("success");
      toast.success("Copied to clipboard", { description: "Lorebook JSON copied successfully" });
      setTimeout(() => setActionStatus("idle"), 2000);
    } catch {
      setActionStatus("idle");
      toast.error("Failed to copy", { description: "Could not copy to clipboard" });
    }
  }, [lorebook]);

  const getParentButtonIcon = () => {
    if (actionStatus === "loading") return <Loader2 className="h-4 w-4 animate-spin" />;
    if (actionStatus === "success") return <Check className="h-4 w-4 text-green-500" />;
    return <Download className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Character Lorebook
            </CardTitle>
            <CardDescription>
              {lorebook.entries.length} entries | Scan Depth: {lorebook.scan_depth} |
              Token Budget: {lorebook.token_budget} | Recursive Scanning: {lorebook.recursive_scanning ? "Yes" : "No"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {viewMode === "list" && lorebook.entries.length > 0 && (
              <ExpandCollapseButton allExpanded={isAllExpanded} onToggle={toggleAllEntries} />
            )}
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === "raw" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2 gap-1"
                onClick={() => setViewMode("raw")}
              >
                <Code className="h-4 w-4" />
                Raw
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild disabled={actionStatus !== "idle"}>
                <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                  {getParentButtonIcon()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownload}>
                  <FileDown className="h-4 w-4" />
                  Save as file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                  <Clipboard className="h-4 w-4" />
                  Copy to clipboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {viewMode === "list" ? (
            <div className="space-y-2">
              {lorebook.entries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No lorebook entries
                </div>
              ) : (
                lorebook.entries.map((entry, i) => (
                  <LorebookEntryItem
                    key={entry.id || i}
                    entry={entry}
                    index={i}
                    open={entriesExpanded[i] ?? false}
                    onOpenChange={(open) => setEntriesExpanded((prev) => ({ ...prev, [i]: open }))}
                  />
                ))
              )}
            </div>
          ) : (
            <JsonViewer
              data={lorebook}
              shouldExpandNode={(level, _value, field) => {
                // Expand root and top-level fields, but collapse individual entries
                if (level === 0) return true;
                if (level === 1 && field !== "entries") return true;
                if (level === 1 && field === "entries") return true;
                // level 2+ are individual entries - start collapsed
                return false;
              }}
            />
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
