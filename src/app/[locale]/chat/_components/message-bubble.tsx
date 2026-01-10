"use client";

import { memo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { User, Trash2, Pencil, Image, Volume2, Languages, MoreHorizontal, MoreVertical, ArrowRightLeft, Loader2 } from "lucide-react";
import { ImageZoomDialog } from "~/components/image-zoom-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { CharacterDocument, ChatBubbleTheme, MessageAttachmentMeta } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";
import { ReasoningCollapsible } from "./reasoning-collapsible";
import { MessageAttachments } from "./message-attachment";

// Asset context for image rendering
interface AssetContext {
  findAssetByName: (name: string) => { id: string; name: string } | null;
  assetUrls: Record<string, string>;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  displayedContent?: string;
  displayedContentLanguage?: string;
  attachmentsMeta?: MessageAttachmentMeta[];
}

// Recursive markdown-style parser for roleplay text
type FormatNode =
  | { type: "text"; content: string }
  | { type: "bold"; children: FormatNode[] }
  | { type: "italic"; children: FormatNode[] }
  | { type: "quote"; children: FormatNode[] }
  | { type: "image"; src: string; alt?: string };

function parseRoleplayText(text: string): FormatNode[] {
  const nodes: FormatNode[] = [];
  let i = 0;

  while (i < text.length) {
    // Check for HTML img tag: <img src="name"> or <img src='name'>
    if (text.slice(i, i + 4).toLowerCase() === "<img") {
      const imgMatch = text.slice(i).match(/^<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*\/?>/i);
      if (imgMatch) {
        const fullMatch = imgMatch[0];
        const src = imgMatch[1]!;
        nodes.push({ type: "image", src });
        i += fullMatch.length;
        continue;
      }
    }

    // Check for Markdown image: ![alt](src)
    if (text.slice(i, i + 2) === "![") {
      const mdMatch = text.slice(i).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (mdMatch) {
        const fullMatch = mdMatch[0];
        const alt = mdMatch[1] || undefined;
        const src = mdMatch[2]!;
        nodes.push({ type: "image", src, alt });
        i += fullMatch.length;
        continue;
      }
    }

    // Check for bold-italic (***text***)
    if (text.slice(i, i + 3) === "***") {
      const closeIndex = text.indexOf("***", i + 3);
      if (closeIndex !== -1) {
        const innerText = text.slice(i + 3, closeIndex);
        nodes.push({
          type: "bold",
          children: [{ type: "italic", children: parseRoleplayText(innerText) }],
        });
        i = closeIndex + 3;
        continue;
      }
    }

    // Check for bold (**text**)
    if (text.slice(i, i + 2) === "**") {
      const closeIndex = text.indexOf("**", i + 2);
      if (closeIndex !== -1) {
        const innerText = text.slice(i + 2, closeIndex);
        nodes.push({
          type: "bold",
          children: parseRoleplayText(innerText),
        });
        i = closeIndex + 2;
        continue;
      }
    }

    // Check for quotes ("text")
    if (text[i] === '"') {
      const closeIndex = text.indexOf('"', i + 1);
      if (closeIndex !== -1) {
        const innerText = text.slice(i + 1, closeIndex);
        nodes.push({
          type: "quote",
          children: parseRoleplayText(innerText),
        });
        i = closeIndex + 1;
        continue;
      }
    }

    // Check for italic/action (*text*)
    if (text[i] === "*") {
      const closeIndex = text.indexOf("*", i + 1);
      if (closeIndex !== -1) {
        const innerText = text.slice(i + 1, closeIndex);
        nodes.push({
          type: "italic",
          children: parseRoleplayText(innerText),
        });
        i = closeIndex + 1;
        continue;
      }
    }

    // Regular text - collect until next special character
    let textContent = "";
    while (i < text.length && text[i] !== "*" && text[i] !== '"' && text[i] !== "<" && text[i] !== "!") {
      textContent += text[i];
      i++;
    }
    // Handle lone < or ! that aren't part of image tags
    if (textContent === "" && (text[i] === "<" || text[i] === "!")) {
      textContent = text[i]!;
      i++;
    }
    if (textContent) {
      nodes.push({ type: "text", content: textContent });
    }
  }

  return nodes;
}

// Component to render character asset images
function AssetImage({ src, alt, assetContext }: { src: string; alt?: string; assetContext?: AssetContext }) {
  if (!assetContext) {
    return (
      <span className="inline-block text-muted-foreground text-xs bg-muted px-2 py-1 rounded">
        [Image: {src}]
      </span>
    );
  }

  const { findAssetByName, assetUrls } = assetContext;
  const asset = findAssetByName(src);

  if (!asset) {
    return (
      <span className="inline-block text-muted-foreground text-xs bg-muted px-2 py-1 rounded">
        [Image not found: {src}]
      </span>
    );
  }

  const dataUrl = assetUrls[asset.id];

  if (!dataUrl) {
    return (
      <span className="inline-block text-muted-foreground text-xs bg-muted px-2 py-1 rounded animate-pulse">
        [Loading: {asset.name}]
      </span>
    );
  }

  return (
    <ImageZoomDialog
      src={dataUrl}
      alt={alt ?? asset.name}
      className="inline-block align-middle"
      imageClassName="max-h-48 max-w-full"
      showZoomIndicator={false}
    />
  );
}

function renderFormatNodes(nodes: FormatNode[], keyPrefix = "", assetContext?: AssetContext): React.ReactNode {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;

    if (node.type === "text") {
      return <span key={key}>{node.content}</span>;
    }

    if (node.type === "bold") {
      return (
        <span key={key} className="font-bold">
          {renderFormatNodes(node.children, key, assetContext)}
        </span>
      );
    }

    if (node.type === "italic") {
      return (
        <span key={key} className="text-muted-foreground italic">
          {renderFormatNodes(node.children, key, assetContext)}
        </span>
      );
    }

    if (node.type === "quote") {
      return (
        <span key={key} className="text-primary font-semibold">
          "{renderFormatNodes(node.children, key, assetContext)}"
        </span>
      );
    }

    if (node.type === "image") {
      return <AssetImage key={key} src={node.src} alt={node.alt} assetContext={assetContext} />;
    }

    return null;
  });
}

// Roleplay text renderer - memoized for performance
const RoleplayText = memo(function RoleplayText({ content, assetContext }: { content: string; assetContext?: AssetContext }) {
  const nodes = parseRoleplayText(content);
  return (
    <div className="whitespace-pre-wrap break-words">
      {renderFormatNodes(nodes, "", assetContext)}
    </div>
  );
});

// Message content renderer based on theme
const MessageContent = memo(function MessageContent({
  content,
  theme,
  isStreaming = false,
  assetContext
}: {
  content: string;
  theme: ChatBubbleTheme;
  isStreaming?: boolean;
  assetContext?: AssetContext
}) {
  if (theme === "messenger") {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  // During streaming, show raw text to avoid expensive parsing
  if (isStreaming) {
    return <div className="whitespace-pre-wrap break-words">{content}</div>;
  }

  return <RoleplayText content={content} assetContext={assetContext} />;
});

interface MessageBubbleProps {
  message: DisplayMessage;
  character: CharacterDocument;
  chatBubbleTheme: ChatBubbleTheme;
  assetContext?: AssetContext;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onEdit: (messageId: string, content: string) => void;
  onDelete: (messageId: string) => void;
  onTranslate: (messageId: string, content: string) => void;
  onGenerateImage: (messageId: string, content: string) => void;
  onGenerateVoice: (messageId: string, content: string) => void;
  isTranslating: boolean;
  isGeneratingImage: boolean;
  isGeneratingVoice: boolean;
  /** Function to get attachment data URL for rendering */
  getAttachmentDataUrl: (messageId: string, attachmentId: string) => Promise<string | null>;
  /** Function to get attachment blob for audio playback */
  getAttachmentBlob: (messageId: string, attachmentId: string) => Promise<Blob | null>;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  character,
  chatBubbleTheme,
  assetContext,
  isFirstInGroup,
  isLastInGroup,
  onEdit,
  onDelete,
  onTranslate,
  onGenerateImage,
  onGenerateVoice,
  isTranslating,
  isGeneratingImage,
  isGeneratingVoice,
  getAttachmentDataUrl,
  getAttachmentBlob,
}: MessageBubbleProps) {
  const t = useTranslations("chat.centerPanel");
  const tActions = useTranslations("actions");

  // LOCAL translation view state - isolated to this bubble
  // true = show translated, false = show original
  const [showTranslation, setShowTranslation] = useState(true);

  const toggleTranslation = useCallback(() => {
    setShowTranslation(prev => !prev);
  }, []);

  const handleEdit = useCallback(() => {
    onEdit(message.id, message.content);
  }, [onEdit, message.id, message.content]);

  const handleDelete = useCallback(() => {
    onDelete(message.id);
  }, [onDelete, message.id]);

  const handleTranslate = useCallback(() => {
    onTranslate(message.id, message.content);
  }, [onTranslate, message.id, message.content]);

  const handleGenerateImage = useCallback(() => {
    onGenerateImage(message.id, message.content);
  }, [onGenerateImage, message.id, message.content]);

  const handleGenerateVoice = useCallback(() => {
    onGenerateVoice(message.id, message.content);
  }, [onGenerateVoice, message.id, message.content]);

  const isSingleMessage = isFirstInGroup && isLastInGroup;
  const isStreaming = message.id === "streaming";

  // Determine which content to display
  const displayContent = message.displayedContent && showTranslation
    ? message.displayedContent
    : message.content;

  // Check if any async operation is running
  const isProcessing = isTranslating || isGeneratingImage || isGeneratingVoice;

  // Desktop button group - shows on hover (hidden on mobile)
  const desktopButtonGroup = !isStreaming && (
    <div className={cn(
      "hidden md:flex shrink-0 items-center gap-1 transition-opacity",
      isProcessing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
    )}>
      {/* Spinner - shows when translating or generating image */}
      {isProcessing && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={handleEdit}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            title="More options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleGenerateImage} disabled={isGeneratingImage}>
            <Image className="h-4 w-4" />
            {isGeneratingImage ? t("generatingImage") : t("generateImage")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGenerateVoice} disabled={isGeneratingVoice}>
            <Volume2 className="h-4 w-4" />
            {isGeneratingVoice ? t("generatingVoice") : t("generateVoice")}
          </DropdownMenuItem>
          {/* Translation options */}
          {message.displayedContent ? (
            <DropdownMenuItem onClick={toggleTranslation}>
              <Languages className="h-4 w-4" />
              {!showTranslation ? t("showTranslation") : t("showOriginal")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={handleTranslate}
              disabled={isTranslating}
            >
              <Languages className="h-4 w-4" />
              {isTranslating ? t("translating") : t("translate")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // Mobile button group - single "⋮" button with all actions (always visible on mobile)
  const mobileButtonGroup = !isStreaming && (
    <div className="flex md:hidden shrink-0 items-center gap-1">
      {/* Spinner - shows when processing */}
      {isProcessing && (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            {tActions("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" />
            {tActions("delete")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGenerateImage} disabled={isGeneratingImage}>
            <Image className="h-4 w-4" />
            {isGeneratingImage ? t("generatingImage") : t("generateImage")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleGenerateVoice} disabled={isGeneratingVoice}>
            <Volume2 className="h-4 w-4" />
            {isGeneratingVoice ? t("generatingVoice") : t("generateVoice")}
          </DropdownMenuItem>
          {/* Translation options */}
          {message.displayedContent ? (
            <DropdownMenuItem onClick={toggleTranslation}>
              <Languages className="h-4 w-4" />
              {!showTranslation ? t("showTranslation") : t("showOriginal")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={handleTranslate}
              disabled={isTranslating}
            >
              <Languages className="h-4 w-4" />
              {isTranslating ? t("translating") : t("translate")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div
      className={cn(
        "flex gap-2 group items-start",
        message.role === "user" ? "flex-row-reverse" : "flex-row",
        !isLastInGroup && "mb-0.5"
      )}
    >
      {/* Avatar - only show for last message in group */}
      {isLastInGroup ? (
        <Avatar className="h-8 w-8 shrink-0">
          {message.role === "user" ? (
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          ) : (
            <>
              <AvatarImage src={character.avatarData} />
              <AvatarFallback>{character.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </>
          )}
        </Avatar>
      ) : (
        <div className="h-8 w-8 shrink-0" />
      )}

      <div className="flex flex-col gap-1 max-w-[480px] min-w-0">
        {/* Reasoning - show above assistant messages if first in group (standalone, no buttons) */}
        {message.role === "assistant" && message.reasoning && isFirstInGroup && (
          <ReasoningCollapsible reasoning={message.reasoning} />
        )}

        {/* Bubble row with buttons - buttons appear next to bubble only */}
        <div
          className={cn(
            "flex gap-2 items-start",
            message.role === "user" ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Main chat bubble */}
          <div
            className={cn(
              "px-4 py-2",
              message.role === "user"
                ? "bg-white dark:bg-primary text-foreground dark:text-primary-foreground border border-border dark:border-transparent"
                : "bg-muted",
              // Border radius based on position in group
              message.role === "user"
                ? cn(
                    isSingleMessage && "rounded-2xl",
                    isFirstInGroup && !isSingleMessage && "rounded-2xl rounded-br-md",
                    !isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-r-md",
                    isLastInGroup && !isSingleMessage && "rounded-2xl rounded-tr-md"
                  )
                : cn(
                    isSingleMessage && "rounded-2xl",
                    isFirstInGroup && !isSingleMessage && "rounded-2xl rounded-bl-md",
                    !isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-l-md",
                    isLastInGroup && !isSingleMessage && "rounded-2xl rounded-tl-md"
                  )
            )}
          >
            <div className="text-sm leading-relaxed">
              <MessageContent
                content={displayContent}
                theme={chatBubbleTheme}
                isStreaming={isStreaming}
                assetContext={assetContext}
              />
            </div>
            {/* Message attachments (images, audio) */}
            {message.attachmentsMeta && message.attachmentsMeta.length > 0 && (
              <MessageAttachments
                messageId={message.id}
                attachments={message.attachmentsMeta}
                getAttachmentDataUrl={getAttachmentDataUrl}
                getAttachmentBlob={getAttachmentBlob}
              />
            )}
            {/* Translation indicator with toggle */}
            {message.displayedContent && (
              <button
                onClick={toggleTranslation}
                className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Languages className="h-3 w-3" />
                <span>
                  {!showTranslation ? t("original") : t("translated")}
                </span>
                <ArrowRightLeft className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Button groups - desktop (hover) and mobile (always visible) */}
          {desktopButtonGroup}
          {mobileButtonGroup}
        </div>
      </div>
    </div>
  );
});

// Re-export types for use in center-panel
export type { DisplayMessage, AssetContext };
