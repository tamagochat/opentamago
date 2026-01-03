"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload, Users, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ExistingCharacterGrid } from "./existing-character-grid";
import { PhotoUploader } from "./photo-uploader";
import { parseCharX, assetToDataUrl } from "~/lib/charx/parser";
import { cn } from "~/lib/utils";
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

  // CharX file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleCharxFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".charx")) {
        toast.error(t("upload.formats"));
        return;
      }

      setIsUploading(true);
      try {
        const parsed = await parseCharX(file);
        if (!parsed.card) {
          toast.error("Invalid CharX file");
          return;
        }

        const cardData = parsed.card.data;

        // Find avatar from assets
        let avatar: string | undefined;
        const iconAsset = cardData.assets.find(
          (a) => a.type === "icon" && a.uri
        );
        if (iconAsset) {
          const uri = iconAsset.uri.replace("embeded://", "");
          const assetData = parsed.assets.get(uri);
          if (assetData) {
            avatar = assetToDataUrl(assetData, uri) ?? undefined;
          }
        }

        const characterData: CharacterData = {
          id: crypto.randomUUID(),
          name: cardData.name,
          description: cardData.description || "",
          personality: cardData.personality || "",
          scenario: cardData.scenario || "",
          firstMessage: cardData.first_mes || "",
          exampleDialogue: cardData.mes_example || "",
          systemPrompt: cardData.system_prompt || "",
          avatar,
        };

        onSelect(characterData);
      } catch (error) {
        console.error("Failed to parse CharX:", error);
        toast.error("Failed to parse CharX file");
      } finally {
        setIsUploading(false);
      }
    },
    [onSelect, t]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleCharxFile(file);
      }
      e.target.value = "";
    },
    [handleCharxFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        void handleCharxFile(file);
      }
    },
    [handleCharxFile]
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="existing" className="flex items-center gap-2">
            <Users className="h-4 w-4 hidden sm:block" />
            <span className="text-xs sm:text-sm">{t("tabs.existing")}</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4 hidden sm:block" />
            <span className="text-xs sm:text-sm">{t("tabs.upload")}</span>
          </TabsTrigger>
          <TabsTrigger value="photo" className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 hidden sm:block" />
            <span className="text-xs sm:text-sm">{t("tabs.photo")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="mt-4">
          <ExistingCharacterGrid
            onSelect={handleExistingSelect}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".charx"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={isUploading || isLoading}
            />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">{t("upload.title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("upload.description")}
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
