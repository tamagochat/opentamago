"use client";

import { useState, useCallback, useEffect, memo } from "react";
import { useTranslations } from "next-intl";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { LorebookEntryFormData } from "~/lib/editor/assistant-types";

interface LorebookEntryFormProps {
  entry: LorebookEntryFormData;
  onUpdate: (id: string, updates: Partial<LorebookEntryFormData>) => void;
}

// Separate memoized form component to prevent re-renders
export const LorebookEntryForm = memo(function LorebookEntryForm({
  entry,
  onUpdate,
}: LorebookEntryFormProps) {
  const t = useTranslations("charxEditor.editor.lorebook");

  // Local state for text inputs to prevent re-renders on every keystroke
  const [localName, setLocalName] = useState(entry.name ?? "");
  const [localKeys, setLocalKeys] = useState(entry.keys.join(", "));
  const [localContent, setLocalContent] = useState(entry.content);
  const [localComment, setLocalComment] = useState(entry.comment ?? "");
  const [localPriority, setLocalPriority] = useState(String(entry.priority));

  // Sync local state when entry changes from external source
  useEffect(() => {
    setLocalName(entry.name ?? "");
    setLocalKeys(entry.keys.join(", "));
    setLocalContent(entry.content);
    setLocalComment(entry.comment ?? "");
    setLocalPriority(String(entry.priority));
  }, [entry.id]); // Only sync when entry ID changes (new entry loaded)

  // Blur handlers to commit changes
  const handleNameBlur = useCallback(() => {
    if (localName !== (entry.name ?? "")) {
      onUpdate(entry.id!, { name: localName });
    }
  }, [localName, entry.id, entry.name, onUpdate]);

  const handleKeysBlur = useCallback(() => {
    const keys = localKeys
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const currentKeys = entry.keys.join(", ");
    if (localKeys !== currentKeys) {
      onUpdate(entry.id!, { keys });
    }
  }, [localKeys, entry.id, entry.keys, onUpdate]);

  const handleContentBlur = useCallback(() => {
    if (localContent !== entry.content) {
      onUpdate(entry.id!, { content: localContent });
    }
  }, [localContent, entry.id, entry.content, onUpdate]);

  const handleCommentBlur = useCallback(() => {
    if (localComment !== (entry.comment ?? "")) {
      onUpdate(entry.id!, { comment: localComment });
    }
  }, [localComment, entry.id, entry.comment, onUpdate]);

  const handlePriorityBlur = useCallback(() => {
    const priority = parseInt(localPriority) || 0;
    if (priority !== entry.priority) {
      onUpdate(entry.id!, { priority });
    }
  }, [localPriority, entry.id, entry.priority, onUpdate]);

  // Toggle handlers (immediate update)
  const handleEnabledChange = useCallback(
    (checked: boolean) => {
      onUpdate(entry.id!, { enabled: checked });
    },
    [entry.id, onUpdate]
  );

  const handleConstantChange = useCallback(
    (checked: boolean) => {
      onUpdate(entry.id!, { constant: checked });
    },
    [entry.id, onUpdate]
  );

  const handleCaseSensitiveChange = useCallback(
    (checked: boolean) => {
      onUpdate(entry.id!, { caseSensitive: checked });
    },
    [entry.id, onUpdate]
  );

  const handleUseRegexChange = useCallback(
    (checked: boolean) => {
      onUpdate(entry.id!, { useRegex: checked });
    },
    [entry.id, onUpdate]
  );

  const handlePositionChange = useCallback(
    (value: string) => {
      onUpdate(entry.id!, { position: value });
    },
    [entry.id, onUpdate]
  );

  return (
    <div className="p-4 space-y-4 border-t">
      {/* Entry Name */}
      <div className="space-y-2">
        <Label>{t("entryName")}</Label>
        <Input
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          placeholder={t("entryNamePlaceholder")}
        />
      </div>

      {/* Keys */}
      <div className="space-y-2">
        <Label>{t("keys")}</Label>
        <Input
          value={localKeys}
          onChange={(e) => setLocalKeys(e.target.value)}
          onBlur={handleKeysBlur}
          placeholder={t("keysPlaceholder")}
        />
        <p className="text-xs text-muted-foreground">{t("keysHint")}</p>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label>{t("content")}</Label>
        <Textarea
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={handleContentBlur}
          placeholder={t("contentPlaceholder")}
          rows={4}
        />
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <Label>{t("enabled")}</Label>
          <Switch
            checked={entry.enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>{t("constant")}</Label>
          <Switch
            checked={entry.constant}
            onCheckedChange={handleConstantChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>{t("caseSensitive")}</Label>
          <Switch
            checked={entry.caseSensitive}
            onCheckedChange={handleCaseSensitiveChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>{t("useRegex")}</Label>
          <Switch
            checked={entry.useRegex}
            onCheckedChange={handleUseRegexChange}
          />
        </div>
      </div>

      {/* Priority and Position */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("priority")}</Label>
          <Input
            type="number"
            value={localPriority}
            onChange={(e) => setLocalPriority(e.target.value)}
            onBlur={handlePriorityBlur}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("position")}</Label>
          <Select value={entry.position} onValueChange={handlePositionChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="before_char">
                {t("positions.before_char")}
              </SelectItem>
              <SelectItem value="after_char">
                {t("positions.after_char")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comment */}
      <div className="space-y-2">
        <Label>{t("comment")}</Label>
        <Textarea
          value={localComment}
          onChange={(e) => setLocalComment(e.target.value)}
          onBlur={handleCommentBlur}
          placeholder={t("commentPlaceholder")}
          rows={2}
        />
      </div>
    </div>
  );
});
