"use client";

import { useState, useCallback } from "react";
import { User, Calendar, Tag, MessageSquare, FileText, Code, FileDown, Download, Clipboard, Loader2, Check, ChevronDown, ChevronsUpDown, ChevronsDownUp, Copy, List } from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { JsonViewer } from "~/components/ui/json-viewer";
import type { CharacterCardV3 } from "~/lib/charx/types";

type ViewMode = "list" | "raw";

function getCharacterFilename(name?: string, originalFilename?: string): string {
  const prefix = name?.trim()
    ?? originalFilename?.replace(/\.[^/.]+$/, "").trim()
    ?? "";

  if (prefix) {
    const sanitized = prefix.replace(/[<>:"/\\|?*]/g, "_");
    return `${sanitized}_character.json`;
  }
  return "character.json";
}

function downloadCharacterAsFile(card: CharacterCardV3, originalFilename?: string) {
  const json = JSON.stringify(card, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getCharacterFilename(card.data.name, originalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function copyCharacterToClipboard(card: CharacterCardV3) {
  const json = JSON.stringify(card, null, 2);
  await navigator.clipboard.writeText(json);
}

interface CharacterCardDisplayProps {
  card: CharacterCardV3;
  originalFilename?: string;
}

type ActionStatus = "idle" | "loading" | "success";
type CopyStatus = "idle" | "loading" | "success";

function TextSection({
  title,
  content,
  icon: Icon,
  open,
  onOpenChange,
}: {
  title: string;
  content: string;
  icon?: React.ComponentType<{ className?: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [renderMarkdown, setRenderMarkdown] = useState(true);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

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
    <Collapsible open={open} onOpenChange={onOpenChange} defaultOpen={open === undefined ? true : undefined}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
        <h4 className="flex items-center gap-2 font-medium text-sm">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </h4>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3">
          {content && (
            <div className="flex items-center justify-end gap-1 mb-2">
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
      </CollapsibleContent>
    </Collapsible>
  );
}

function ExpandCollapseButton({ allExpanded, onToggle }: { allExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex justify-end mb-2">
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
    </div>
  );
}

function GreetingContent({ content }: { content: string }) {
  const [renderMarkdown, setRenderMarkdown] = useState(true);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

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
      {content && (
        <div className="flex items-center justify-end gap-1 mb-2">
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
      {renderMarkdown ? (
        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
          <Markdown>{content}</Markdown>
        </div>
      ) : (
        <pre className="whitespace-pre-wrap text-sm font-mono">{content}</pre>
      )}
    </div>
  );
}

export function CharacterCardDisplay({ card, originalFilename }: CharacterCardDisplayProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [actionStatus, setActionStatus] = useState<ActionStatus>("idle");
  const [basicExpanded, setBasicExpanded] = useState({ description: true, personality: true, scenario: true });
  const [messagesExpanded, setMessagesExpanded] = useState({ firstMessage: true, exampleMessages: true, alternateGreetings: true, groupOnlyGreetings: true });
  const [promptsExpanded, setPromptsExpanded] = useState({ systemPrompt: true, postHistory: true });
  const [metaExpanded, setMetaExpanded] = useState({ specInfo: true, creatorInfo: true, dates: true, creatorNotes: true });
  const data = card.data;

  const isAllBasicExpanded = Object.values(basicExpanded).every(Boolean);
  const isAllMessagesExpanded = Object.values(messagesExpanded).every(Boolean);
  const isAllPromptsExpanded = Object.values(promptsExpanded).every(Boolean);
  const isAllMetaExpanded = Object.values(metaExpanded).every(Boolean);

  const toggleAllBasic = () => {
    const newValue = !isAllBasicExpanded;
    setBasicExpanded({ description: newValue, personality: newValue, scenario: newValue });
  };

  const toggleAllMessages = () => {
    const newValue = !isAllMessagesExpanded;
    setMessagesExpanded({ firstMessage: newValue, exampleMessages: newValue, alternateGreetings: newValue, groupOnlyGreetings: newValue });
  };

  const toggleAllPrompts = () => {
    const newValue = !isAllPromptsExpanded;
    setPromptsExpanded({ systemPrompt: newValue, postHistory: newValue });
  };

  const toggleAllMeta = () => {
    const newValue = !isAllMetaExpanded;
    setMetaExpanded({ specInfo: newValue, creatorInfo: newValue, dates: newValue, creatorNotes: newValue });
  };

  const handleDownload = useCallback(async () => {
    setActionStatus("loading");
    await new Promise((resolve) => setTimeout(resolve, 300));
    downloadCharacterAsFile(card, originalFilename);
    setActionStatus("success");
    const filename = getCharacterFilename(card.data.name, originalFilename);
    toast.success("File saved", { description: filename });
    setTimeout(() => setActionStatus("idle"), 2000);
  }, [card, originalFilename]);

  const handleCopy = useCallback(async () => {
    setActionStatus("loading");
    try {
      await copyCharacterToClipboard(card);
      setActionStatus("success");
      toast.success("Copied to clipboard", { description: "Character JSON copied successfully" });
      setTimeout(() => setActionStatus("idle"), 2000);
    } catch {
      setActionStatus("idle");
      toast.error("Failed to copy", { description: "Could not copy to clipboard" });
    }
  }, [card]);

  const getDownloadIcon = () => {
    if (actionStatus === "loading") return <Loader2 className="h-4 w-4 animate-spin" />;
    if (actionStatus === "success") return <Check className="h-4 w-4 text-green-500" />;
    return <Download className="h-4 w-4" />;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {data.name || "Unnamed Character"}
              <Badge variant="outline" className="font-normal text-xs">
                {card.spec} v{card.spec_version}
              </Badge>
            </CardTitle>
            <CardDescription>
              {data.creator && (
                <span className="mr-3">by {data.creator}</span>
              )}
              {data.character_version && (
                <span className="text-xs">v{data.character_version}</span>
              )}
            </CardDescription>
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
                  {getDownloadIcon()}
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
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {data.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {(data.creation_date || data.modification_date) && (
          <div className="flex gap-4 text-xs text-muted-foreground pt-2">
            {data.creation_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created: {formatDate(data.creation_date)}
              </span>
            )}
            {data.modification_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Modified: {formatDate(data.modification_date)}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {viewMode === "raw" ? (
          <ScrollArea className="h-[500px] pr-4">
            <JsonViewer
              data={card}
              shouldExpandNode={(level, _value, field) => {
                if (level === 0) return true;
                if (level === 1 && field !== "data") return true;
                if (level === 1 && field === "data") return true;
                return false;
              }}
            />
          </ScrollArea>
        ) : (
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="meta">Others</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <ExpandCollapseButton allExpanded={isAllBasicExpanded} onToggle={toggleAllBasic} />
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <TextSection
                  title="Description"
                  content={data.description}
                  icon={FileText}
                  open={basicExpanded.description}
                  onOpenChange={(open) => setBasicExpanded((prev) => ({ ...prev, description: open }))}
                />
                <TextSection
                  title="Personality"
                  content={data.personality}
                  icon={User}
                  open={basicExpanded.personality}
                  onOpenChange={(open) => setBasicExpanded((prev) => ({ ...prev, personality: open }))}
                />
                <TextSection
                  title="Scenario"
                  content={data.scenario}
                  icon={FileText}
                  open={basicExpanded.scenario}
                  onOpenChange={(open) => setBasicExpanded((prev) => ({ ...prev, scenario: open }))}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            <ExpandCollapseButton allExpanded={isAllMessagesExpanded} onToggle={toggleAllMessages} />
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <TextSection
                  title="First Message"
                  content={data.first_mes}
                  icon={MessageSquare}
                  open={messagesExpanded.firstMessage}
                  onOpenChange={(open) => setMessagesExpanded((prev) => ({ ...prev, firstMessage: open }))}
                />

                <TextSection
                  title="Example Messages"
                  content={data.mes_example}
                  icon={MessageSquare}
                  open={messagesExpanded.exampleMessages}
                  onOpenChange={(open) => setMessagesExpanded((prev) => ({ ...prev, exampleMessages: open }))}
                />

                <Collapsible open={messagesExpanded.alternateGreetings} onOpenChange={(open) => setMessagesExpanded((prev) => ({ ...prev, alternateGreetings: open }))}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                    <h4 className="flex items-center gap-2 font-medium text-sm">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Alternate Greetings ({data.alternate_greetings.length})
                    </h4>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3 space-y-2">
                      {data.alternate_greetings.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Empty</p>
                      ) : (
                        data.alternate_greetings.map((greeting, i) => (
                          <div key={i} className="rounded-md bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Greeting {i + 1}
                            </p>
                            <GreetingContent content={greeting} />
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={messagesExpanded.groupOnlyGreetings} onOpenChange={(open) => setMessagesExpanded((prev) => ({ ...prev, groupOnlyGreetings: open }))}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                    <h4 className="flex items-center gap-2 font-medium text-sm">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Group Only Greetings ({data.group_only_greetings.length})
                    </h4>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3 space-y-2">
                      {data.group_only_greetings.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Empty</p>
                      ) : (
                        data.group_only_greetings.map((greeting, i) => (
                          <div key={i} className="rounded-md bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground mb-1">
                              Greeting {i + 1}
                            </p>
                            <GreetingContent content={greeting} />
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="prompts" className="mt-4">
            <ExpandCollapseButton allExpanded={isAllPromptsExpanded} onToggle={toggleAllPrompts} />
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <TextSection
                  title="System Prompt"
                  content={data.system_prompt}
                  icon={FileText}
                  open={promptsExpanded.systemPrompt}
                  onOpenChange={(open) => setPromptsExpanded((prev) => ({ ...prev, systemPrompt: open }))}
                />
                <TextSection
                  title="Post History Instructions"
                  content={data.post_history_instructions}
                  icon={FileText}
                  open={promptsExpanded.postHistory}
                  onOpenChange={(open) => setPromptsExpanded((prev) => ({ ...prev, postHistory: open }))}
                />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="meta" className="mt-4">
            <ExpandCollapseButton allExpanded={isAllMetaExpanded} onToggle={toggleAllMeta} />
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <Collapsible open={metaExpanded.specInfo} onOpenChange={(open) => setMetaExpanded((prev) => ({ ...prev, specInfo: open }))}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                    <h4 className="flex items-center gap-2 font-medium text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Spec Info
                    </h4>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md bg-muted/50 p-2">
                          <span className="text-muted-foreground">Spec:</span>{" "}
                          {card.spec || <span className="italic text-muted-foreground">Empty</span>}
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <span className="text-muted-foreground">Spec Version:</span>{" "}
                          {card.spec_version || <span className="italic text-muted-foreground">Empty</span>}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={metaExpanded.creatorInfo} onOpenChange={(open) => setMetaExpanded((prev) => ({ ...prev, creatorInfo: open }))}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                    <h4 className="flex items-center gap-2 font-medium text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Creator Info
                    </h4>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md bg-muted/50 p-2">
                          <span className="text-muted-foreground">Creator:</span>{" "}
                          {data.creator || <span className="italic text-muted-foreground">Empty</span>}
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <span className="text-muted-foreground">Character Version:</span>{" "}
                          {data.character_version || <span className="italic text-muted-foreground">Empty</span>}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <Collapsible open={metaExpanded.dates} onOpenChange={(open) => setMetaExpanded((prev) => ({ ...prev, dates: open }))}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                    <h4 className="flex items-center gap-2 font-medium text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Dates
                    </h4>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md bg-muted/50 p-2">
                          <span className="text-muted-foreground">Created:</span>{" "}
                          {formatDate(data.creation_date) || <span className="italic text-muted-foreground">Empty</span>}
                        </div>
                        <div className="rounded-md bg-muted/50 p-2">
                          <span className="text-muted-foreground">Modified:</span>{" "}
                          {formatDate(data.modification_date) || <span className="italic text-muted-foreground">Empty</span>}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                <TextSection
                  title="Creator Notes"
                  content={data.creator_notes}
                  icon={FileText}
                  open={metaExpanded.creatorNotes}
                  onOpenChange={(open) => setMetaExpanded((prev) => ({ ...prev, creatorNotes: open }))}
                />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
