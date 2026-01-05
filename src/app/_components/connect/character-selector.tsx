"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload, Users, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ExistingCharacterGrid } from "./existing-character-grid";
import { PhotoUploader } from "./photo-uploader";
import { useCharxImport } from "~/lib/charx";
import { cn } from "~/lib/utils";
import type { CharacterData } from "~/lib/connect/messages";
import type { CharacterDocument } from "~/lib/db/schemas";

interface CharacterSelectorProps {
  onSelect: (character: CharacterData) => void;
  isLoading?: boolean;
  onOpenSettings?: () => void;
}

interface CharacterPreviewData {
  character: CharacterData;
  creator?: string;
  characterVersion?: string;
  tags: string[];
  lorebookEntryCount: number;
  alternateGreetingCount: number;
}

export function CharacterSelector({
  onSelect,
  isLoading,
  onOpenSettings,
}: CharacterSelectorProps) {
  const t = useTranslations("connect");
  const [activeTab, setActiveTab] = useState("existing");
  const [uploadedPreview, setUploadedPreview] = useState<CharacterPreviewData | null>(null);

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

  const { importCharx, isImporting } = useCharxImport({
    onError: (error) => {
      toast.error(t("upload.error"), { description: error.message });
    },
  });

  const handleCharxFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".charx")) {
        toast.error(t("upload.formats"));
        return;
      }

      const parsedData = await importCharx(file);
      if (parsedData) {
        const char = parsedData.character;
        // Convert avatar blob to data URL if present
        let avatarDataUrl: string | undefined;
        if (parsedData.avatarBlob) {
          try {
            const { blobToDataUrl } = await import("~/lib/image-utils");
            avatarDataUrl = await blobToDataUrl(parsedData.avatarBlob);
          } catch (error) {
            console.error("Failed to convert avatar blob:", error);
            avatarDataUrl = char.avatarData;
          }
        } else {
          avatarDataUrl = char.avatarData;
        }

        const characterData: CharacterData = {
          id: crypto.randomUUID(),
          name: char.name,
          description: char.description || "",
          personality: char.personality || "",
          scenario: char.scenario || "",
          firstMessage: char.firstMessage || "",
          exampleDialogue: char.exampleDialogue || "",
          systemPrompt: char.systemPrompt || "",
          avatar: avatarDataUrl,
        };

        // Show preview in upload tab
        setUploadedPreview({
          character: characterData,
          creator: char.creator,
          characterVersion: char.characterVersion,
          tags: char.tags || [],
          lorebookEntryCount: parsedData.lorebookEntries.length,
          alternateGreetingCount: char.alternateGreetings?.length || 0,
        });
        setActiveTab("upload");
      }
    },
    [t, importCharx]
  );

  const handleSelectUploadedCharacter = useCallback(() => {
    if (uploadedPreview) {
      onSelect(uploadedPreview.character);
    }
  }, [uploadedPreview, onSelect]);

  const handleRemoveUploadedCharacter = useCallback(() => {
    setUploadedPreview(null);
  }, []);

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
          <div className={cn("grid gap-4", uploadedPreview ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            {/* Uploaded Character Card */}
            {uploadedPreview && (
              <div
                className="relative rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all"
                onClick={handleSelectUploadedCharacter}
              >
                {/* Avatar */}
                {uploadedPreview.character.avatar && (
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    <img
                      src={uploadedPreview.character.avatar}
                      alt={uploadedPreview.character.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Content */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate">
                      {uploadedPreview.character.name}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveUploadedCharacter();
                      }}
                      className="shrink-0 h-6 w-6"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {uploadedPreview.creator && (
                    <p className="text-xs text-muted-foreground truncate">
                      by {uploadedPreview.creator}
                    </p>
                  )}
                  {uploadedPreview.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {uploadedPreview.tags.slice(0, 2).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {uploadedPreview.tags.length > 2 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{uploadedPreview.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                  {(uploadedPreview.lorebookEntryCount > 0 || uploadedPreview.alternateGreetingCount > 0) && (
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      {uploadedPreview.lorebookEntryCount > 0 && (
                        <span>Lorebook: {uploadedPreview.lorebookEntryCount}</span>
                      )}
                      {uploadedPreview.alternateGreetingCount > 0 && (
                        <span>{uploadedPreview.alternateGreetingCount + 1} greetings</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload Drop Zone */}
            <Card
              className={cn(
                "border-2 border-dashed flex flex-col items-center justify-center transition-colors cursor-pointer",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                uploadedPreview
                  ? "min-h-[200px] sm:min-h-[250px] p-4"
                  : "min-h-[250px] sm:min-h-[320px] p-12"
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
                disabled={isImporting || isLoading}
              />
              {isImporting ? (
                <>
                  <Loader2 className={cn("animate-spin text-muted-foreground mb-3", uploadedPreview ? "h-8 w-8" : "h-16 w-16")} />
                  <span className={cn("text-muted-foreground", uploadedPreview ? "text-sm" : "text-lg")}>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className={cn("text-muted-foreground mb-4", uploadedPreview ? "h-8 w-8" : "h-20 w-20")} />
                  <h3 className={cn("font-medium", uploadedPreview ? "text-sm" : "text-2xl")}>{t("upload.title")}</h3>
                  <p className={cn("text-muted-foreground text-center max-w-md", uploadedPreview ? "text-xs mt-1" : "text-base mt-3")}>
                    {uploadedPreview ? "Drop another .charx file" : t("upload.description")}
                  </p>
                </>
              )}
            </Card>
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
