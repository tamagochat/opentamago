"use client";

import { useState, useCallback } from "react";
import {
  User,
  Calendar,
  Tag,
  MessageSquare,
  FileText,
  Code,
  Loader2,
  Check,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Copy,
  List,
} from "lucide-react";
import Markdown from "react-markdown";
import { useTranslations, useFormatter } from "next-intl";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { JsonViewer } from "~/components/ui/json-viewer";
import type { CharacterDocument } from "~/lib/db/schemas/character";

type ViewMode = "list" | "raw";
type CopyStatus = "idle" | "loading" | "success";

interface StoredCharacterDisplayProps {
  character: CharacterDocument;
  isLoading?: boolean;
}

function TextSection({
  title,
  content,
  icon: Icon,
  open,
  onOpenChange,
  translations,
}: {
  title: string;
  content: string;
  icon?: React.ComponentType<{ className?: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  translations: {
    markdown: string;
    raw: string;
    empty: string;
    copiedToClipboard: string;
    failedToCopy: string;
  };
}) {
  const [renderMarkdown, setRenderMarkdown] = useState(true);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

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
            {collapseAllLabel}
          </>
        ) : (
          <>
            <ChevronsUpDown className="h-4 w-4" />
            {expandAllLabel}
          </>
        )}
      </Button>
    </div>
  );
}

function GreetingContent({
  content,
  translations,
}: {
  content: string;
  translations: {
    markdown: string;
    raw: string;
    copiedToClipboard: string;
    failedToCopy: string;
  };
}) {
  const [renderMarkdown, setRenderMarkdown] = useState(true);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

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

export function StoredCharacterDisplay({ character, isLoading }: StoredCharacterDisplayProps) {
  const t = useTranslations("pokebox");
  const format = useFormatter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [basicExpanded, setBasicExpanded] = useState({
    description: true,
    personality: true,
    scenario: true,
  });
  const [messagesExpanded, setMessagesExpanded] = useState({
    firstMessage: true,
    exampleMessages: true,
    alternateGreetings: true,
    groupOnlyGreetings: true,
  });
  const [promptsExpanded, setPromptsExpanded] = useState({
    systemPrompt: true,
    postHistory: true,
  });
  const [metaExpanded, setMetaExpanded] = useState({
    creatorInfo: true,
    dates: true,
    creatorNotes: true,
  });

  const textSectionTranslations = {
    markdown: t("viewMode.markdown"),
    raw: t("viewMode.raw"),
    empty: t("empty"),
    copiedToClipboard: t("toast.copiedToClipboard"),
    failedToCopy: t("toast.failedToCopy"),
  };

  const greetingTranslations = {
    markdown: t("viewMode.markdown"),
    raw: t("viewMode.raw"),
    copiedToClipboard: t("toast.copiedToClipboard"),
    failedToCopy: t("toast.failedToCopy"),
  };

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
    setMessagesExpanded({
      firstMessage: newValue,
      exampleMessages: newValue,
      alternateGreetings: newValue,
      groupOnlyGreetings: newValue,
    });
  };

  const toggleAllPrompts = () => {
    const newValue = !isAllPromptsExpanded;
    setPromptsExpanded({ systemPrompt: newValue, postHistory: newValue });
  };

  const toggleAllMeta = () => {
    const newValue = !isAllMetaExpanded;
    setMetaExpanded({ creatorInfo: newValue, dates: newValue, creatorNotes: newValue });
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return null;
    return format.dateTime(new Date(timestamp), {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {character.name || t("unnamedCharacter")}
              </span>
            </CardTitle>
            <CardDescription>
              {character.creator && (
                <span className="mr-3">{t("byCreator", { creator: character.creator })}</span>
              )}
              {character.characterVersion && (
                <span className="text-xs">v{character.characterVersion}</span>
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
        {character.tags && character.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {character.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {(character.createdAt || character.updatedAt) && (
          <div className="flex gap-4 text-xs text-muted-foreground pt-2">
            {character.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("created")}: {formatDate(character.createdAt)}
              </span>
            )}
            {character.updatedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {t("modified")}: {formatDate(character.updatedAt)}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {viewMode === "raw" ? (
          <ScrollArea className="h-full">
            <JsonViewer
              data={character}
              shouldExpandNode={(level, _value, field) => {
                if (level === 0) return true;
                if (level === 1 && field !== "extensions") return true;
                return false;
              }}
            />
          </ScrollArea>
        ) : (
          <Tabs defaultValue="basic" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="basic">{t("characterTabs.basic")}</TabsTrigger>
              <TabsTrigger value="messages">{t("characterTabs.messages")}</TabsTrigger>
              <TabsTrigger value="prompts">{t("characterTabs.prompts")}</TabsTrigger>
              <TabsTrigger value="meta">{t("characterTabs.others")}</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden mt-4">
              <TabsContent value="basic" className="mt-0 h-full">
                <ExpandCollapseButton
                  allExpanded={isAllBasicExpanded}
                  onToggle={toggleAllBasic}
                  expandAllLabel={t("expandAll")}
                  collapseAllLabel={t("collapseAll")}
                />
                <ScrollArea className="h-[calc(100%-32px)]">
                  <div className="space-y-4 pr-4">
                    <TextSection
                      title={t("fields.description")}
                      content={character.description}
                      icon={FileText}
                      open={basicExpanded.description}
                      onOpenChange={(open) => setBasicExpanded((prev) => ({ ...prev, description: open }))}
                      translations={textSectionTranslations}
                    />
                    <TextSection
                      title={t("fields.personality")}
                      content={character.personality}
                      icon={User}
                      open={basicExpanded.personality}
                      onOpenChange={(open) => setBasicExpanded((prev) => ({ ...prev, personality: open }))}
                      translations={textSectionTranslations}
                    />
                    <TextSection
                      title={t("fields.scenario")}
                      content={character.scenario}
                      icon={FileText}
                      open={basicExpanded.scenario}
                      onOpenChange={(open) => setBasicExpanded((prev) => ({ ...prev, scenario: open }))}
                      translations={textSectionTranslations}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="messages" className="mt-0 h-full">
                <ExpandCollapseButton
                  allExpanded={isAllMessagesExpanded}
                  onToggle={toggleAllMessages}
                  expandAllLabel={t("expandAll")}
                  collapseAllLabel={t("collapseAll")}
                />
                <ScrollArea className="h-[calc(100%-32px)]">
                  <div className="space-y-4 pr-4">
                    <TextSection
                      title={t("fields.firstMessage")}
                      content={character.firstMessage}
                      icon={MessageSquare}
                      open={messagesExpanded.firstMessage}
                      onOpenChange={(open) => setMessagesExpanded((prev) => ({ ...prev, firstMessage: open }))}
                      translations={textSectionTranslations}
                    />

                    <TextSection
                      title={t("fields.exampleDialogue")}
                      content={character.exampleDialogue}
                      icon={MessageSquare}
                      open={messagesExpanded.exampleMessages}
                      onOpenChange={(open) => setMessagesExpanded((prev) => ({ ...prev, exampleMessages: open }))}
                      translations={textSectionTranslations}
                    />

                    <Collapsible
                      open={messagesExpanded.alternateGreetings}
                      onOpenChange={(open) => setMessagesExpanded((prev) => ({ ...prev, alternateGreetings: open }))}
                    >
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                        <h4 className="flex items-center gap-2 font-medium text-sm">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          {t("fields.alternateGreetings")} ({character.alternateGreetings?.length ?? 0})
                        </h4>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3 space-y-2">
                          {!character.alternateGreetings || character.alternateGreetings.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">{t("empty")}</p>
                          ) : (
                            character.alternateGreetings.map((greeting, i) => (
                              <div key={i} className="rounded-md bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {t("greetingIndex", { index: i + 1 })}
                                </p>
                                <GreetingContent content={greeting} translations={greetingTranslations} />
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible
                      open={messagesExpanded.groupOnlyGreetings}
                      onOpenChange={(open) => setMessagesExpanded((prev) => ({ ...prev, groupOnlyGreetings: open }))}
                    >
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                        <h4 className="flex items-center gap-2 font-medium text-sm">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          {t("fields.groupOnlyGreetings")} ({character.groupOnlyGreetings?.length ?? 0})
                        </h4>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3 space-y-2">
                          {!character.groupOnlyGreetings || character.groupOnlyGreetings.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">{t("empty")}</p>
                          ) : (
                            character.groupOnlyGreetings.map((greeting, i) => (
                              <div key={i} className="rounded-md bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {t("greetingIndex", { index: i + 1 })}
                                </p>
                                <GreetingContent content={greeting} translations={greetingTranslations} />
                              </div>
                            ))
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="prompts" className="mt-0 h-full">
                <ExpandCollapseButton
                  allExpanded={isAllPromptsExpanded}
                  onToggle={toggleAllPrompts}
                  expandAllLabel={t("expandAll")}
                  collapseAllLabel={t("collapseAll")}
                />
                <ScrollArea className="h-[calc(100%-32px)]">
                  <div className="space-y-4 pr-4">
                    <TextSection
                      title={t("fields.systemPrompt")}
                      content={character.systemPrompt}
                      icon={FileText}
                      open={promptsExpanded.systemPrompt}
                      onOpenChange={(open) => setPromptsExpanded((prev) => ({ ...prev, systemPrompt: open }))}
                      translations={textSectionTranslations}
                    />
                    <TextSection
                      title={t("fields.postHistoryInstructions")}
                      content={character.postHistoryInstructions}
                      icon={FileText}
                      open={promptsExpanded.postHistory}
                      onOpenChange={(open) => setPromptsExpanded((prev) => ({ ...prev, postHistory: open }))}
                      translations={textSectionTranslations}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="meta" className="mt-0 h-full">
                <ExpandCollapseButton
                  allExpanded={isAllMetaExpanded}
                  onToggle={toggleAllMeta}
                  expandAllLabel={t("expandAll")}
                  collapseAllLabel={t("collapseAll")}
                />
                <ScrollArea className="h-[calc(100%-32px)]">
                  <div className="space-y-4 pr-4">
                    <Collapsible
                      open={metaExpanded.creatorInfo}
                      onOpenChange={(open) => setMetaExpanded((prev) => ({ ...prev, creatorInfo: open }))}
                    >
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                        <h4 className="flex items-center gap-2 font-medium text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {t("fields.creatorInfo")}
                        </h4>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-md bg-muted/50 p-2">
                              <span className="text-muted-foreground">{t("fields.creator")}:</span>{" "}
                              {character.creator || <span className="italic text-muted-foreground">{t("empty")}</span>}
                            </div>
                            <div className="rounded-md bg-muted/50 p-2">
                              <span className="text-muted-foreground">{t("fields.characterVersion")}:</span>{" "}
                              {character.characterVersion || <span className="italic text-muted-foreground">{t("empty")}</span>}
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <Collapsible
                      open={metaExpanded.dates}
                      onOpenChange={(open) => setMetaExpanded((prev) => ({ ...prev, dates: open }))}
                    >
                      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
                        <h4 className="flex items-center gap-2 font-medium text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {t("fields.dates")}
                        </h4>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="rounded-md rounded-t-none border border-t-0 bg-background p-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="rounded-md bg-muted/50 p-2">
                              <span className="text-muted-foreground">{t("created")}:</span>{" "}
                              {formatDate(character.createdAt) || <span className="italic text-muted-foreground">{t("empty")}</span>}
                            </div>
                            <div className="rounded-md bg-muted/50 p-2">
                              <span className="text-muted-foreground">{t("modified")}:</span>{" "}
                              {formatDate(character.updatedAt) || <span className="italic text-muted-foreground">{t("empty")}</span>}
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <TextSection
                      title={t("fields.creatorNotes")}
                      content={character.creatorNotes}
                      icon={FileText}
                      open={metaExpanded.creatorNotes}
                      onOpenChange={(open) => setMetaExpanded((prev) => ({ ...prev, creatorNotes: open }))}
                      translations={textSectionTranslations}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
