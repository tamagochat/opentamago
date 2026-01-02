"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Upload, Camera, Users, ImagePlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { ExistingCharacterGrid } from "./existing-character-grid";
import { PhotoUploader } from "./photo-uploader";
import type { CharacterData } from "~/lib/connect/messages";
import type { CharacterDocument } from "~/lib/db/schemas";

interface CharacterSelectorProps {
  onSelect: (character: CharacterData) => void;
  isLoading?: boolean;
  onOpenSettings?: () => void;
}

export function CharacterSelector({
  onSelect,
  isLoading,
  onOpenSettings,
}: CharacterSelectorProps) {
  const t = useTranslations("connect");
  const [activeTab, setActiveTab] = useState("existing");

  const handleExistingSelect = useCallback(
    (character: CharacterDocument) => {
      const characterData: CharacterData = {
        id: character.id,
        name: character.name,
        description: character.description || "",
        personality: character.personality || "",
        scenario: character.scenario || "",
        firstMessage: character.firstMessage || "",
        exampleDialogue: character.exampleDialogue || "",
        systemPrompt: character.systemPrompt || "",
        avatar: character.avatarData,
      };
      onSelect(characterData);
    },
    [onSelect]
  );

  const handlePhotoGenerated = useCallback(
    (character: CharacterData) => {
      onSelect(character);
    },
    [onSelect]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="existing" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.existing")}</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.upload")}</span>
          </TabsTrigger>
          <TabsTrigger value="photo" className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.photo")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="mt-4">
          <ExistingCharacterGrid
            onSelect={handleExistingSelect}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">{t("upload.title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("upload.description")}
            </p>
            <Button variant="outline" className="mt-4" disabled>
              {t("upload.selectFile")}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("upload.formats")}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="photo" className="mt-4">
          <PhotoUploader
            onCharacterGenerated={handlePhotoGenerated}
            onOpenSettings={onOpenSettings}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
