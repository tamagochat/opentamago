"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Upload } from "lucide-react";
import { useCharacters } from "~/lib/db/hooks";
import type { CharacterDocument } from "~/lib/db/schemas";

interface CharacterEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character?: CharacterDocument | null;
  onSave?: (character: CharacterDocument) => void;
}

type FormData = Omit<CharacterDocument, "id" | "createdAt" | "updatedAt">;

const defaultFormData: FormData = {
  name: "",
  description: "",
  personality: "",
  scenario: "",
  firstMessage: "",
  exampleDialogue: "",
  systemPrompt: "",
  creatorNotes: "",
  tags: [],
  avatarData: undefined,
};

export function CharacterEditor({
  open,
  onOpenChange,
  character,
  onSave,
}: CharacterEditorProps) {
  const t = useTranslations("chat.editor");
  const tActions = useTranslations("actions");
  const { createCharacter, updateCharacter } = useCharacters();
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(character);

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name,
        description: character.description,
        personality: character.personality,
        scenario: character.scenario,
        firstMessage: character.firstMessage,
        exampleDialogue: character.exampleDialogue,
        systemPrompt: character.systemPrompt,
        creatorNotes: character.creatorNotes,
        tags: character.tags,
        avatarData: character.avatarData,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [character, open]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === "string") {
        setFormData((prev) => ({ ...prev, avatarData: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      let saved: CharacterDocument | null;
      if (isEditing && character) {
        saved = await updateCharacter(character.id, formData);
      } else {
        saved = await createCharacter(formData);
      }
      if (saved) {
        onSave?.(saved);
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {isEditing ? t("editCharacter") : t("createCharacter")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("modifyCharacter") : t("createCharacterDesc")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="px-6 pb-6">
            <div className="mb-6 flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.avatarData} />
                <AvatarFallback className="text-2xl">
                  {formData.name.slice(0, 2).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t("uploadAvatar")}
                </Button>
                <p className="text-muted-foreground mt-1 text-xs">{t("avatarHint")}</p>
              </div>
            </div>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger value="basic">{t("basic")}</TabsTrigger>
                <TabsTrigger value="advanced">{t("advanced")}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("nameRequired")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder={t("characterName")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">{t("description")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder={t("descriptionCharacter")}
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="firstMessage">{t("firstMessage")}</Label>
                  <Textarea
                    id="firstMessage"
                    value={formData.firstMessage}
                    onChange={(e) => updateField("firstMessage", e.target.value)}
                    placeholder={t("firstMessagePlaceholder")}
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="personality">{t("personality")}</Label>
                  <Textarea
                    id="personality"
                    value={formData.personality}
                    onChange={(e) => updateField("personality", e.target.value)}
                    placeholder={t("personalityCharacter")}
                    rows={4}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="scenario">{t("scenario")}</Label>
                  <Textarea
                    id="scenario"
                    value={formData.scenario}
                    onChange={(e) => updateField("scenario", e.target.value)}
                    placeholder={t("scenarioPlaceholder")}
                    rows={4}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="exampleDialogue">{t("exampleDialogue")}</Label>
                  <Textarea
                    id="exampleDialogue"
                    value={formData.exampleDialogue}
                    onChange={(e) => updateField("exampleDialogue", e.target.value)}
                    placeholder={t("exampleDialoguePlaceholder")}
                    rows={6}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="systemPrompt">{t("systemPrompt")}</Label>
                  <Textarea
                    id="systemPrompt"
                    value={formData.systemPrompt}
                    onChange={(e) => updateField("systemPrompt", e.target.value)}
                    placeholder={t("systemPromptPlaceholder")}
                    rows={6}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="creatorNotes">{t("creatorNotes")}</Label>
                  <Textarea
                    id="creatorNotes"
                    value={formData.creatorNotes}
                    onChange={(e) => updateField("creatorNotes", e.target.value)}
                    placeholder={t("notesPlaceholder")}
                    rows={3}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <div className="border-t px-6 py-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tActions("cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
              {isSaving
                ? t("saving")
                : isEditing
                  ? t("saveChanges")
                  : t("createCharacter")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
