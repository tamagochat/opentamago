"use client";

import { useCallback, useRef, useState, memo } from "react";
import { Upload, X, Plus, User } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UseFormReturn } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Form,
} from "~/components/ui/form";
import type { CharacterFormData } from "~/lib/editor/assistant-types";
import { useFormContext } from "./editor-context";

// Container component - connects to context
export const CharacterFormContainer = memo(function CharacterFormContainer() {
  const { form } = useFormContext();
  return <CharacterForm form={form} />;
});

// Main form component - memoized
const CharacterForm = memo(function CharacterForm({
  form,
}: {
  form: UseFormReturn<CharacterFormData>;
}) {
  const t = useTranslations("charxEditor.editor.character");

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* Avatar and Name Section */}
        <AvatarNameSection form={form} />

        {/* Tabbed Content */}
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t("basic")}</TabsTrigger>
            <TabsTrigger value="messages">{t("messages")}</TabsTrigger>
            <TabsTrigger value="prompts">{t("prompts")}</TabsTrigger>
            <TabsTrigger value="meta">{t("meta")}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <BasicTab form={form} />
          </TabsContent>

          <TabsContent value="messages" className="space-y-4 mt-4">
            <MessagesTab form={form} />
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4 mt-4">
            <PromptsTab form={form} />
          </TabsContent>

          <TabsContent value="meta" className="space-y-4 mt-4">
            <MetaTab form={form} />
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
});

// Avatar and Name Section - memoized
const AvatarNameSection = memo(function AvatarNameSection({
  form,
}: {
  form: UseFormReturn<CharacterFormData>;
}) {
  const t = useTranslations("charxEditor.editor.character");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarData = form.watch("avatarData");

  const handleAvatarUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        return;
      }

      // Store reference to input for reset after read completes
      const inputElement = e.target;

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === "string") {
          form.setValue("avatarData", result, { shouldDirty: true, shouldTouch: true });
        }
        // Reset input after successful read to allow re-uploading the same file
        inputElement.value = "";
      };
      reader.onerror = () => {
        console.error("Failed to read avatar file");
        inputElement.value = "";
      };
      reader.readAsDataURL(file);
    },
    [form]
  );

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Avatar */}
      <div className="flex-shrink-0">
        <Label className="text-sm font-medium mb-2 block">{t("avatar")}</Label>
        <div
          className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
          onClick={handleAvatarClick}
        >
          {avatarData ? (
            <img
              src={avatarData}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground">
              <User className="h-8 w-8" />
              <span className="text-xs">{t("uploadAvatar")}</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <p className="text-xs text-muted-foreground mt-1">{t("avatarHint")}</p>
      </div>

      {/* Name */}
      <div className="flex-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("nameRequired")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("name")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
});

// Basic Tab - memoized
const BasicTab = memo(function BasicTab({
  form,
}: {
  form: UseFormReturn<CharacterFormData>;
}) {
  const t = useTranslations("charxEditor.editor.character");

  return (
    <>
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("description")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("descriptionPlaceholder")}
                rows={4}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="personality"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("personality")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("personalityPlaceholder")}
                rows={3}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="scenario"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("scenario")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("scenarioPlaceholder")}
                rows={3}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
});

// Messages Tab - memoized
const MessagesTab = memo(function MessagesTab({
  form,
}: {
  form: UseFormReturn<CharacterFormData>;
}) {
  const t = useTranslations("charxEditor.editor.character");
  const alternateGreetings = form.watch("alternateGreetings") ?? [];

  const handleAddGreeting = useCallback(() => {
    const current = form.getValues("alternateGreetings") ?? [];
    form.setValue("alternateGreetings", [...current, ""], {
      shouldDirty: true,
    });
  }, [form]);

  const handleRemoveGreeting = useCallback(
    (index: number) => {
      const current = form.getValues("alternateGreetings") ?? [];
      form.setValue(
        "alternateGreetings",
        current.filter((_, i) => i !== index),
        { shouldDirty: true }
      );
    },
    [form]
  );

  const handleGreetingChange = useCallback(
    (index: number, value: string) => {
      const current = form.getValues("alternateGreetings") ?? [];
      const newGreetings = [...current];
      newGreetings[index] = value;
      form.setValue("alternateGreetings", newGreetings, { shouldDirty: true });
    },
    [form]
  );

  return (
    <>
      <FormField
        control={form.control}
        name="firstMessage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("firstMessage")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("firstMessagePlaceholder")}
                rows={4}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="exampleDialogue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("exampleDialogue")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("exampleDialoguePlaceholder")}
                rows={6}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Alternate Greetings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{t("alternateGreetings")}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddGreeting}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("addGreeting")}
          </Button>
        </div>
        {alternateGreetings.map((greeting, index) => (
          <div key={index} className="flex gap-2">
            <Textarea
              value={greeting}
              onChange={(e) => handleGreetingChange(index, e.target.value)}
              placeholder={t("greetingPlaceholder")}
              rows={3}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveGreeting(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </>
  );
});

// Prompts Tab - memoized
const PromptsTab = memo(function PromptsTab({
  form,
}: {
  form: UseFormReturn<CharacterFormData>;
}) {
  const t = useTranslations("charxEditor.editor.character");

  return (
    <>
      <FormField
        control={form.control}
        name="systemPrompt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("systemPrompt")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("systemPromptPlaceholder")}
                rows={6}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="postHistoryInstructions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("postHistory")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("postHistoryPlaceholder")}
                rows={4}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
});

// Meta Tab - memoized
const MetaTab = memo(function MetaTab({
  form,
}: {
  form: UseFormReturn<CharacterFormData>;
}) {
  const t = useTranslations("charxEditor.editor.character");
  const [tagInput, setTagInput] = useState("");
  const tags = form.watch("tags") ?? [];

  const handleAddTag = useCallback(
    (value?: string) => {
      const trimmed = (value ?? tagInput).trim();
      const currentTags = form.getValues("tags") ?? [];
      if (trimmed && !currentTags.includes(trimmed)) {
        form.setValue("tags", [...currentTags, trimmed], { shouldDirty: true });
      }
      setTagInput("");
    },
    [tagInput, form]
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const currentTags = form.getValues("tags") ?? [];
      form.setValue(
        "tags",
        currentTags.filter((t) => t !== tag),
        { shouldDirty: true }
      );
    },
    [form]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Check if comma was typed
      if (value.includes(",")) {
        const parts = value.split(",");
        const tagToAdd = parts[0]?.trim();
        if (tagToAdd) {
          handleAddTag(tagToAdd);
        }
        // Set remaining text after comma (if any)
        setTagInput(parts.slice(1).join(","));
      } else {
        setTagInput(value);
      }
    },
    [handleAddTag]
  );

  return (
    <>
      {/* Tags */}
      <div className="space-y-2">
        <Label>{t("tags")}</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={handleInputChange}
            placeholder={t("addTag")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={() => handleAddTag()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="creator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("creator")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("creatorPlaceholder")} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="characterVersion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("version")}</FormLabel>
              <FormControl>
                <Input {...field} placeholder={t("versionPlaceholder")} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="creatorNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("creatorNotes")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                placeholder={t("creatorNotesPlaceholder")}
                rows={4}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
});
