"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload, Camera, Loader2, X, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Card } from "~/components/ui/card";
import { toast } from "sonner";
import type { CharacterData } from "~/lib/connect/messages";
import { CONNECT_CONFIG } from "~/lib/connect";
import { useSettings } from "~/lib/db/hooks";
import { generateCharacterFromImage } from "~/lib/ai";
import { cn } from "~/lib/utils";

interface PhotoUploaderProps {
  onCharacterGenerated: (character: CharacterData) => void;
  onOpenSettings?: () => void;
}

export function PhotoUploader({ onCharacterGenerated, onOpenSettings }: PhotoUploaderProps) {
  const t = useTranslations("connect");
  const { settings, isApiReady, effectiveApiKey, isClientMode } = useSettings();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (
        !CONNECT_CONFIG.SUPPORTED_IMAGE_TYPES.includes(
          file.type as (typeof CONNECT_CONFIG.SUPPORTED_IMAGE_TYPES)[number]
        )
      ) {
        toast.error(t("photo.invalidType"));
        return;
      }

      // Validate file size
      if (file.size > CONNECT_CONFIG.MAX_IMAGE_SIZE) {
        toast.error(t("photo.tooLarge"));
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [t]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (!file) return;

      // Create a fake event to reuse the handler
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    },
    [handleFileSelect]
  );

  const handleGenerate = useCallback(async () => {
    if (!selectedFile) return;

    if (!isApiReady) {
      toast.error(t("photo.noApiKey"));
      return;
    }

    setIsGenerating(true);

    try {
      // Use client-side function that handles both modes
      const character = await generateCharacterFromImage({
        image: selectedFile,
        context: additionalContext || undefined,
        apiKey: effectiveApiKey ?? undefined,
        isClientMode,
      });

      // Add the image as avatar
      const characterData: CharacterData = {
        id: crypto.randomUUID(),
        name: character.name,
        description: character.description,
        personality: character.personality,
        scenario: character.scenario,
        firstMessage: character.firstMessage,
        exampleDialogue: character.exampleDialogue,
        systemPrompt: character.systemPrompt,
        avatar: selectedImage || undefined,
      };

      toast.success(t("photo.generated", { name: character.name }));
      onCharacterGenerated(characterData);
    } catch (error) {
      console.error("Error generating character:", error);
      toast.error(
        error instanceof Error ? error.message : t("photo.generateError")
      );
    } finally {
      setIsGenerating(false);
    }
  }, [selectedFile, selectedImage, additionalContext, t, onCharacterGenerated, isApiReady, effectiveApiKey, isClientMode]);

  const clearSelection = useCallback(() => {
    setSelectedImage(null);
    setSelectedFile(null);
    setAdditionalContext("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Show warning if API is not ready (client mode without API key)
  if (!isApiReady) {
    return (
      <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">
          {t("photo.apiKeyRequired")}
        </AlertTitle>
        <AlertDescription className="space-y-2 text-yellow-700 dark:text-yellow-300">
          <p>{t("photo.apiKeyDescription")}</p>
          {onOpenSettings && (
            <Button variant="outline" size="sm" onClick={onOpenSettings}>
              {t("photo.goToSettings")}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!selectedImage ? (
        <Card
          className={cn(
            "border-2 border-dashed p-8 text-center",
            "hover:border-primary/50 transition-colors cursor-pointer"
          )}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={CONNECT_CONFIG.SUPPORTED_IMAGE_TYPES.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">{t("photo.dropTitle")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("photo.dropDescription")}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={selectedImage}
              alt="Selected"
              className="w-full max-h-64 object-contain rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">{t("photo.contextLabel")}</Label>
            <Input
              id="context"
              placeholder={t("photo.contextPlaceholder")}
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("photo.contextHint")}
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("photo.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("photo.generate")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
