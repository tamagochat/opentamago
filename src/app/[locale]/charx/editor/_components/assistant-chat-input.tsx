"use client";

import { useState, useRef, useCallback, memo } from "react";
import { Send, Loader2, MessageSquare, ImageIcon, Sparkles, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { SettingsModal } from "~/components/settings-modal";
import {
  useLoadingContext,
  useApiKeyContext,
  useAssistantActionsContext,
} from "./assistant-context";

type InputMode = "chat" | "image";

// Chat input - subscribes to isLoading, missingApiKey, and actions
export const AssistantChatInput = memo(function AssistantChatInput() {
  const t = useTranslations("charxEditor.assistant");
  const { isLoading } = useLoadingContext();
  const { missingApiKey } = useApiKeyContext();
  const { sendMessage, generateImageFromPrompt, abortGeneration } = useAssistantActionsContext();

  const [input, setInput] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("chat");
  const [useAiPrompt, setUseAiPrompt] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = !!missingApiKey || isLoading;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isDisabled) return;

      const message = input;
      setInput("");

      if (inputMode === "image") {
        await generateImageFromPrompt(message, useAiPrompt);
      } else {
        await sendMessage(message);
      }
    },
    [input, isDisabled, inputMode, useAiPrompt, sendMessage, generateImageFromPrompt]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  const placeholder = inputMode === "image"
    ? t("imagePlaceholder")
    : t("placeholder");

  return (
    <form onSubmit={handleSubmit} className="border-t p-4 shrink-0">
      {/* Mode Toggle Row */}
      <div className="flex items-center gap-2 mb-2">
        {/* Mode Toggle Buttons */}
        <div className="flex rounded-md border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={inputMode === "chat" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2 rounded-r-none"
                onClick={() => setInputMode("chat")}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("chatMode")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={inputMode === "image" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2 rounded-l-none"
                onClick={() => setInputMode("image")}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{t("imageMode")}</TooltipContent>
          </Tooltip>
        </div>

        {/* AI Enhancement Toggle (only in image mode) */}
        {inputMode === "image" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={useAiPrompt ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 px-2",
                  useAiPrompt && "text-primary"
                )}
                onClick={() => setUseAiPrompt(!useAiPrompt)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {useAiPrompt ? t("aiEnhanceOn") : t("aiEnhanceOff")}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Settings Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("openSettings")}</TooltipContent>
        </Tooltip>

        {/* Settings Modal */}
        <SettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          hideTextScenarios={["chat", "translation", "hitmeup"]}
        />
      </div>

      {/* Input Row */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[80px] resize-none"
          disabled={isDisabled}
        />
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isDisabled}
            className="h-10 w-10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : inputMode === "image" ? (
              <ImageIcon className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          {isLoading && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={abortGeneration}
              className="h-10 w-10"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
    </form>
  );
});
