"use client";

import { useState, useEffect } from "react";
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
import { useCharacters } from "~/lib/db/hooks";
import type { CharacterDocument } from "~/lib/db/schemas";

interface PersonaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona?: CharacterDocument | null;
  onSave?: (persona: CharacterDocument) => void;
}

type FormData = {
  name: string;
  description: string;
  personality: string;
};

const defaultFormData: FormData = {
  name: "",
  description: "",
  personality: "",
};

export function PersonaEditor({
  open,
  onOpenChange,
  persona,
  onSave,
}: PersonaEditorProps) {
  const t = useTranslations("chat.editor");
  const tActions = useTranslations("actions");
  const { createCharacter, updateCharacter } = useCharacters();
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(persona);

  useEffect(() => {
    if (persona) {
      setFormData({
        name: persona.name,
        description: persona.description,
        personality: persona.personality,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [persona, open]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      let saved: CharacterDocument | null;
      if (isEditing && persona) {
        saved = await updateCharacter(persona.id, formData);
      } else {
        saved = await createCharacter({
          ...formData,
          scenario: "",
          firstMessage: "",
          exampleDialogue: "",
          systemPrompt: "",
          creatorNotes: "",
          tags: [],
          avatarData: undefined,
        });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t("editPersona") : t("createPersona")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("modifyPersona") : t("createPersonaDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t("nameRequired")}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={t("yourName")}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder={t("descriptionPersona")}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="personality">{t("aboutMe")}</Label>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => updateField("personality", e.target.value)}
              placeholder={t("personalityPersona")}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tActions("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
            {isSaving
              ? t("saving")
              : isEditing
                ? t("saveChanges")
                : t("createPersona")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
