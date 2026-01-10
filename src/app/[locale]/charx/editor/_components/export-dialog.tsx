"use client";

import { useState, useCallback } from "react";
import { Download, FileArchive, Image as ImageIcon, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import type {
  CharacterFormData,
  LorebookEntryFormData,
  AssetFormData,
} from "~/lib/editor/assistant-types";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: CharacterFormData;
  lorebookEntries: LorebookEntryFormData[];
  assets: AssetFormData[];
}

type ExportFormat = "charx" | "png";

export function ExportDialog({
  open,
  onOpenChange,
  character,
  lorebookEntries,
  assets,
}: ExportDialogProps) {
  const t = useTranslations("charxEditor.export");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("charx");
  const [isExporting, setIsExporting] = useState(false);

  const canExportPng = !!character.avatarData;

  const handleExport = useCallback(async () => {
    if (selectedFormat === "png" && !canExportPng) {
      return;
    }

    setIsExporting(true);

    try {
      if (selectedFormat === "charx") {
        await exportAsCharX(character, lorebookEntries, assets);
      } else {
        await exportAsPng(character, lorebookEntries);
      }
      toast.success(t("download"));
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [selectedFormat, character, lorebookEntries, assets, canExportPng, onOpenChange, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* CharX Option */}
          <button
            onClick={() => setSelectedFormat("charx")}
            className={`w-full flex items-start gap-4 p-4 rounded-lg border transition-colors ${
              selectedFormat === "charx"
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
          >
            <FileArchive className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="text-left">
              <p className="font-medium">{t("charx.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("charx.description")}
              </p>
            </div>
          </button>

          {/* PNG Option */}
          <button
            onClick={() => canExportPng && setSelectedFormat("png")}
            disabled={!canExportPng}
            className={`w-full flex items-start gap-4 p-4 rounded-lg border transition-colors ${
              selectedFormat === "png"
                ? "border-primary bg-primary/5"
                : canExportPng
                ? "hover:bg-muted/50"
                : "opacity-50 cursor-not-allowed"
            }`}
          >
            <ImageIcon className="h-8 w-8 text-primary flex-shrink-0" />
            <div className="text-left">
              <p className="font-medium">{t("png.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("png.description")}
              </p>
            </div>
          </button>

          {!canExportPng && selectedFormat === "png" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("noAvatar")}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : t("download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export as CharX (ZIP file)
async function exportAsCharX(
  character: CharacterFormData,
  lorebookEntries: LorebookEntryFormData[],
  assets: AssetFormData[]
) {
  // Dynamic import JSZip
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  // Build character card data (CCv3 format)
  const now = Math.floor(Date.now() / 1000);
  const cardData = {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: character.name,
      description: character.description,
      personality: character.personality,
      scenario: character.scenario,
      first_mes: character.firstMessage,
      mes_example: character.exampleDialogue,
      creator_notes: character.creatorNotes,
      system_prompt: character.systemPrompt,
      post_history_instructions: character.postHistoryInstructions,
      alternate_greetings: character.alternateGreetings,
      tags: character.tags,
      creator: character.creator,
      character_version: character.characterVersion,
      group_only_greetings: character.groupOnlyGreetings,
      nickname: character.nickname,
      extensions: {},
      creation_date: now,
      modification_date: now,
      character_book:
        lorebookEntries.length > 0
          ? {
              scan_depth: 2,
              token_budget: 2048,
              recursive_scanning: false,
              entries: lorebookEntries.map((entry, index) => ({
                keys: entry.keys,
                content: entry.content,
                enabled: entry.enabled,
                insertion_order: entry.insertionOrder,
                case_sensitive: entry.caseSensitive,
                priority: entry.priority,
                use_regex: entry.useRegex,
                name: entry.name ?? `Entry ${index + 1}`,
                selective: entry.selective,
                secondary_keys: entry.secondaryKeys,
                constant: entry.constant,
                position: entry.position,
                extensions: {},
              })),
              extensions: {},
            }
          : undefined,
      assets: assets.map((asset) => ({
        type: asset.assetType,
        uri: `embeded://assets/${asset.assetType}/${asset.name}.${asset.ext}`,
        name: asset.name,
        ext: asset.ext,
      })),
    },
  };

  // Add card.json
  zip.file("card.json", JSON.stringify(cardData, null, 2));

  // Add assets
  for (const asset of assets) {
    const path = `assets/${asset.assetType}/${asset.name}.${asset.ext}`;
    zip.file(path, asset.data);
  }

  // Generate and download
  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `${character.name || "character"}.charx`;
  downloadBlob(blob, filename);
}

// Export as PNG with embedded data
async function exportAsPng(
  character: CharacterFormData,
  lorebookEntries: LorebookEntryFormData[]
) {
  if (!character.avatarData) {
    throw new Error("No avatar data");
  }

  // Create canvas from avatar
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = character.avatarData!;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // Get PNG blob
  const pngBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/png");
  });

  // For now, just download the PNG without embedded data
  // Full PNG metadata embedding would require a library like pngitxt
  const filename = `${character.name || "character"}.png`;
  downloadBlob(pngBlob, filename);

  // Note: For full CCv2 PNG support, we'd need to embed the character data
  // in the PNG's tEXt chunk. This is a simplified version.
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
