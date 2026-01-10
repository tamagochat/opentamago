"use client";

import { useState, useCallback, memo } from "react";
import { Copy, Check, ChevronDown, BookPlus, FileText, User, Sparkles, ImagePlus, Download, ImageIcon } from "lucide-react";
import { ImageZoomDialog } from "~/components/image-zoom-dialog";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import type {
  AssistantMessage as AssistantMessageType,
  CharacterField,
  AssetFormData,
} from "~/lib/editor/assistant-types";
import { analyzeContent, parseLorebookFormat } from "~/lib/editor/assistant-types";

interface AssistantMessageProps {
  message: AssistantMessageType;
  onCopyToField: (field: CharacterField, content: string) => void;
  onCopyToLorebook: (keys: string[], content: string) => void;
  onAddAsset: (data: Uint8Array, name: string, assetType: AssetFormData["assetType"]) => void;
  onSetAvatar: (data: Uint8Array) => void;
  onGenerateImage?: (prompt: string, useAiEnhancement: boolean) => Promise<void>;
  isLoading?: boolean;
}

const FIELD_OPTIONS: { field: CharacterField; labelKey: string }[] = [
  { field: "description", labelKey: "description" },
  { field: "personality", labelKey: "personality" },
  { field: "scenario", labelKey: "scenario" },
  { field: "firstMessage", labelKey: "firstMessage" },
  { field: "exampleDialogue", labelKey: "exampleDialogue" },
  { field: "systemPrompt", labelKey: "systemPrompt" },
  { field: "postHistoryInstructions", labelKey: "postHistory" },
  { field: "creatorNotes", labelKey: "creatorNotes" },
];

export const AssistantMessageItem = memo(function AssistantMessageItem({
  message,
  onCopyToField,
  onCopyToLorebook,
  onAddAsset,
  onSetAvatar,
  onGenerateImage,
  isLoading,
}: AssistantMessageProps) {
  const t = useTranslations("charxEditor.assistant");
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";
  const actionContext = !isUser ? analyzeContent(message.content) : null;
  const lorebookParsed = actionContext?.hasLorebookFormat
    ? parseLorebookFormat(message.content)
    : null;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success(t("actions.copy"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [message.content, t]);

  const handleCopyToLorebook = useCallback(() => {
    if (lorebookParsed) {
      onCopyToLorebook(lorebookParsed.keys, lorebookParsed.content);
    } else {
      // Use first line as key, rest as content
      const lines = message.content.split("\n");
      const firstLine = lines[0] ?? "entry";
      const content = lines.slice(1).join("\n").trim() || message.content;
      const keys = firstLine
        .split(/[,;]/)
        .map((k) => k.trim())
        .filter(Boolean)
        .slice(0, 5);
      onCopyToLorebook(keys.length > 0 ? keys : ["entry"], content);
    }
  }, [message.content, lorebookParsed, onCopyToLorebook]);

  const handleAddToAssets = useCallback(
    (assetType: AssetFormData["assetType"]) => {
      if (message.imageData) {
        const name = `generated_${Date.now()}`;
        onAddAsset(message.imageData, name, assetType);
      }
    },
    [message.imageData, onAddAsset]
  );

  const handleSetAvatar = useCallback(() => {
    if (message.imageData) {
      onSetAvatar(message.imageData);
    }
  }, [message.imageData, onSetAvatar]);

  const handleDownloadImage = useCallback(() => {
    if (message.imageDataUrl) {
      const link = document.createElement("a");
      link.href = message.imageDataUrl;
      link.download = `generated_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("actions.downloaded"));
    }
  }, [message.imageDataUrl, t]);

  const handleGenerateImage = useCallback(() => {
    if (message.content && onGenerateImage) {
      void onGenerateImage(message.content, true);
    }
  }, [message.content, onGenerateImage]);

  const hasImage = !!message.imageDataUrl;

  if (isLoading) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-2" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-secondary" : "bg-primary/10"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 space-y-2", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-lg px-4 py-2 max-w-full",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          {/* Text content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words text-left">
              {message.content}
            </p>
          )}
          {/* Image content */}
          {hasImage && (
            <div className={cn(message.content && "mt-2", "space-y-2")}>
              <ImageZoomDialog
                src={message.imageDataUrl!}
                alt="Generated image"
                imageClassName="max-w-full w-auto h-auto"
                imageStyle={{ maxHeight: "300px" }}
                downloadFilename={`generated_${Date.now()}.png`}
              />
              {/* Image Actions - directly below the image */}
              {message.imageData && (
                <div className="flex flex-wrap gap-1">
                  {/* Add to Assets Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <ImagePlus className="h-3 w-3 mr-1" />
                        {t("actions.addToAssets")}
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleSetAvatar}>
                        {t("assetTypes.avatar")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddToAssets("icon")}>
                        {t("assetTypes.icon")}
                        {message.suggestedAssetType === "icon" && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Suggested
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddToAssets("emotion")}>
                        {t("assetTypes.emotion")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddToAssets("background")}>
                        {t("assetTypes.background")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAddToAssets("other")}>
                        {t("assetTypes.other")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Download Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadImage}
                    className="h-6 px-2 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {t("actions.download")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons for text content (only for assistant messages) */}
        {!isUser && message.content && (
          <div className="flex flex-wrap gap-2">
            {/* Copy Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 mr-1" />
              )}
              {t("actions.copy")}
            </Button>

            {/* Copy to Field Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {t("actions.copyToField")}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {FIELD_OPTIONS.map(({ field, labelKey }) => (
                  <DropdownMenuItem
                    key={field}
                    onClick={() => onCopyToField(field, message.content)}
                  >
                    {t(`fields.${labelKey}`)}
                    {actionContext?.suggestedFields.includes(field) && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Suggested
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add to Lorebook Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyToLorebook}
              className="h-7 px-2 text-xs"
            >
              <BookPlus className="h-3 w-3 mr-1" />
              {t("actions.copyToLorebook")}
              {lorebookParsed && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  Parsed
                </Badge>
              )}
            </Button>

            {/* Generate Image Button (only for text messages without images) */}
            {!hasImage && onGenerateImage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateImage}
                className="h-7 px-2 text-xs"
              >
                <ImageIcon className="h-3 w-3 mr-1" />
                {t("actions.generateImage")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
